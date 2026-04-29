import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder as MongooseSortOrder, Types } from 'mongoose';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CreateBookDto } from './dto/create-book.dto';
import {
  BookSortBy,
  FindBooksQueryDto,
  SortOrder,
} from './dto/find-books-query.dto';
import { PaginatedBooksResponseDto } from './dto/paginated-books-response.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './schemas/book.schema';

const SEARCHABLE_FIELDS = ['title', 'author', 'genre', 'isbn'] as const;
const BOOK_LIST_KEYS_SET = 'books:list:keys';
type BooksFilter = Record<string, unknown>;

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private readonly bookModel: Model<Book>,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  async create(createBookDto: CreateBookDto): Promise<Book> {
    try {
      const book = await this.bookModel.create(createBookDto);
      await this.invalidateListCache();
      return book;
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findAll(query: FindBooksQueryDto): Promise<PaginatedBooksResponseDto> {
    const cacheKey = this.buildListCacheKey(query);
    const cachedBooks =
      await this.getCachedValue<PaginatedBooksResponseDto>(cacheKey);

    if (cachedBooks) {
      return cachedBooks;
    }

    const { page, limit, search, sortBy, sortOrder } = query;
    const filter = this.buildFilter(search);
    const skip = (page - 1) * limit;
    const sort = this.buildSort(sortBy, sortOrder);

    const [total, items] = await Promise.all([
      this.bookModel.countDocuments(filter).exec(),
      this.bookModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const response = {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    await this.setCachedValue(cacheKey, response);
    await this.trackListCacheKey(cacheKey);

    return response;
  }

  async findOne(id: string): Promise<Book> {
    this.validateObjectId(id);

    const cacheKey = this.buildItemCacheKey(id);
    const cachedBook = await this.getCachedValue<Book>(cacheKey);

    if (cachedBook) {
      return cachedBook;
    }

    const book = await this.bookModel.findById(id).exec();

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    await this.setCachedValue(cacheKey, book);

    return book;
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book> {
    this.validateObjectId(id);

    try {
      const book = await this.bookModel
        .findByIdAndUpdate(id, updateBookDto, {
          returnDocument: 'after',
          runValidators: true,
        })
        .exec();

      if (!book) {
        throw new NotFoundException('Book not found');
      }

      await this.invalidateItemAndListCache(id);

      return book;
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async remove(id: string): Promise<void> {
    this.validateObjectId(id);

    const book = await this.bookModel.findByIdAndDelete(id).exec();

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    await this.invalidateItemAndListCache(id);
  }

  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid book id');
    }
  }

  private handleMongoError(error: unknown): never {
    if (this.isDuplicateKeyError(error)) {
      throw new ConflictException('A book with that ISBN already exists');
    }

    throw error;
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'number' &&
      error.code === 11000
    );
  }

  private buildFilter(search?: string): BooksFilter {
    if (!search) {
      return {};
    }

    const sanitizedSearch = this.escapeRegex(search);
    const searchRegex = new RegExp(sanitizedSearch, 'i');

    return {
      $or: SEARCHABLE_FIELDS.map((field) => ({
        [field]: searchRegex,
      })),
    };
  }

  private buildSort(
    sortBy: BookSortBy,
    sortOrder: SortOrder,
  ): Record<string, MongooseSortOrder> {
    return {
      [sortBy]: sortOrder === SortOrder.ASC ? 1 : -1,
    };
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildListCacheKey(query: FindBooksQueryDto): string {
    const fingerprint = JSON.stringify({
      page: query.page,
      limit: query.limit,
      search: query.search ?? null,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return `books:list:${Buffer.from(fingerprint).toString('base64url')}`;
  }

  private buildItemCacheKey(id: string): string {
    return `books:item:${id}`;
  }

  private async getCachedValue<T>(key: string): Promise<T | null> {
    try {
      return await this.redisCacheService.get<T>(key);
    } catch {
      return null;
    }
  }

  private async setCachedValue(key: string, value: unknown): Promise<void> {
    try {
      await this.redisCacheService.set(key, value);
    } catch {
      return;
    }
  }

  private async trackListCacheKey(key: string): Promise<void> {
    try {
      await this.redisCacheService.addToSet(BOOK_LIST_KEYS_SET, key);
    } catch {
      return;
    }
  }

  private async invalidateItemAndListCache(id: string): Promise<void> {
    try {
      await Promise.all([
        this.redisCacheService.delete(this.buildItemCacheKey(id)),
        this.invalidateListCache(),
      ]);
    } catch {
      return;
    }
  }

  private async invalidateListCache(): Promise<void> {
    try {
      const listKeys =
        await this.redisCacheService.getSetMembers(BOOK_LIST_KEYS_SET);

      if (listKeys.length === 0) {
        return;
      }

      await this.redisCacheService.deleteMany([
        ...listKeys,
        BOOK_LIST_KEYS_SET,
      ]);
    } catch {
      return;
    }
  }
}
