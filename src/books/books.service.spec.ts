import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisCacheService } from '../cache/redis-cache.service';
import {
  BookSortBy,
  FindBooksQueryDto,
  SortOrder,
} from './dto/find-books-query.dto';
import { BooksService } from './books.service';
import { Book } from './schemas/book.schema';

describe('BooksService', () => {
  let service: BooksService;

  const findExec = jest.fn();
  const findLimit = jest.fn();
  const findSkip = jest.fn();
  const findSort = jest.fn();
  const find = jest.fn();
  const countDocumentsExec = jest.fn();
  const countDocuments = jest.fn();

  const bookModel = {
    create: jest.fn(),
    countDocuments,
    find,
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  const redisCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    addToSet: jest.fn(),
    getSetMembers: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    findLimit.mockReturnValue({ exec: findExec });
    findSkip.mockReturnValue({ limit: findLimit });
    findSort.mockReturnValue({ skip: findSkip });
    find.mockReturnValue({ sort: findSort });
    countDocuments.mockReturnValue({ exec: countDocumentsExec });
    redisCacheService.get.mockResolvedValue(null);
    redisCacheService.set.mockResolvedValue(undefined);
    redisCacheService.addToSet.mockResolvedValue(undefined);
    redisCacheService.getSetMembers.mockResolvedValue([]);
    redisCacheService.delete.mockResolvedValue(undefined);
    redisCacheService.deleteMany.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: getModelToken(Book.name),
          useValue: bookModel,
        },
        {
          provide: RedisCacheService,
          useValue: redisCacheService,
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  it('creates a book', async () => {
    const book = {
      title: 'Book',
      author: 'Author',
      year: 2024,
      genre: 'Tech',
      isbn: '123',
      price: 9.99,
      url: 'https://example.com/book',
    };

    bookModel.create.mockResolvedValue(book);

    await expect(service.create(book)).resolves.toEqual(book);
    expect(bookModel.create).toHaveBeenCalledWith(book);
  });

  it('invalidates cached book lists after creating a book', async () => {
    const book = {
      title: 'Book',
      author: 'Author',
      year: 2024,
      genre: 'Tech',
      isbn: '123',
      price: 9.99,
      url: 'https://example.com/book',
    };

    bookModel.create.mockResolvedValue(book);
    redisCacheService.getSetMembers.mockResolvedValue(['books:list:abc']);

    await service.create(book);

    expect(redisCacheService.getSetMembers).toHaveBeenCalledWith(
      'books:list:keys',
    );
    expect(redisCacheService.deleteMany).toHaveBeenCalledWith([
      'books:list:abc',
      'books:list:keys',
    ]);
  });

  it('returns cached paginated books without querying mongodb', async () => {
    const cachedResponse = {
      items: [{ id: '1', title: 'Cached Book' }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    redisCacheService.get.mockResolvedValue(cachedResponse);

    await expect(service.findAll(new FindBooksQueryDto())).resolves.toEqual(
      cachedResponse,
    );
    expect(countDocuments).not.toHaveBeenCalled();
    expect(find).not.toHaveBeenCalled();
  });

  it('returns paginated books using default query options', async () => {
    const books = [{ title: 'Clean Code' }];

    countDocumentsExec.mockResolvedValue(1);
    findExec.mockResolvedValue(books);

    const result = await service.findAll(new FindBooksQueryDto());

    expect(countDocuments).toHaveBeenCalledWith({});
    expect(find).toHaveBeenCalledWith({});
    expect(findSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(findSkip).toHaveBeenCalledWith(0);
    expect(findLimit).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      items: books,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    expect(redisCacheService.set).toHaveBeenCalledWith(
      expect.stringMatching(/^books:list:/),
      result,
    );
    expect(redisCacheService.addToSet).toHaveBeenCalledWith(
      'books:list:keys',
      expect.stringMatching(/^books:list:/),
    );
  });

  it('applies search, sorting and pagination parameters', async () => {
    countDocumentsExec.mockResolvedValue(3);
    findExec.mockResolvedValue([]);

    await service.findAll({
      page: 2,
      limit: 2,
      search: 'martin',
      sortBy: BookSortBy.TITLE,
      sortOrder: SortOrder.ASC,
    });

    expect(countDocuments).toHaveBeenCalledWith({
      $or: [
        { title: /martin/i },
        { author: /martin/i },
        { genre: /martin/i },
        { isbn: /martin/i },
      ],
    });
    expect(findSort).toHaveBeenCalledWith({ title: 1 });
    expect(findSkip).toHaveBeenCalledWith(2);
    expect(findLimit).toHaveBeenCalledWith(2);
  });

  it('falls back to mongodb when cache reads fail', async () => {
    const books = [{ title: 'Clean Code' }];

    redisCacheService.get.mockRejectedValue(new Error('redis down'));
    countDocumentsExec.mockResolvedValue(1);
    findExec.mockResolvedValue(books);

    await expect(service.findAll(new FindBooksQueryDto())).resolves.toEqual({
      items: books,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    expect(countDocuments).toHaveBeenCalledWith({});
  });

  it('throws conflict on duplicate isbn during create', async () => {
    bookModel.create.mockRejectedValue({ code: 11000 });

    await expect(
      service.create({
        title: 'Book',
        author: 'Author',
        year: 2024,
        genre: 'Tech',
        isbn: '123',
        price: 9.99,
        url: 'https://example.com/book',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws bad request for an invalid id', async () => {
    await expect(service.findOne('invalid-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns a cached book without querying mongodb', async () => {
    const cachedBook = {
      id: '507f1f77bcf86cd799439011',
      title: 'Cached Book',
    };

    redisCacheService.get.mockResolvedValue(cachedBook);

    await expect(service.findOne('507f1f77bcf86cd799439011')).resolves.toEqual(
      cachedBook,
    );
    expect(bookModel.findById).not.toHaveBeenCalled();
  });

  it('stores a book in cache after a cache miss', async () => {
    const book = {
      id: '507f1f77bcf86cd799439011',
      title: 'Domain-Driven Design',
    };

    bookModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(book),
    });

    await expect(service.findOne('507f1f77bcf86cd799439011')).resolves.toEqual(
      book,
    );
    expect(redisCacheService.set).toHaveBeenCalledWith(
      'books:item:507f1f77bcf86cd799439011',
      book,
    );
  });

  it('throws not found when updating a missing book', async () => {
    bookModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.update('507f1f77bcf86cd799439011', { title: 'Updated' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('invalidates cached item and lists after updating a book', async () => {
    bookModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ id: '507f1f77bcf86cd799439011' }),
    });
    redisCacheService.getSetMembers.mockResolvedValue(['books:list:abc']);

    await service.update('507f1f77bcf86cd799439011', { title: 'Updated' });

    expect(redisCacheService.delete).toHaveBeenCalledWith(
      'books:item:507f1f77bcf86cd799439011',
    );
    expect(redisCacheService.deleteMany).toHaveBeenCalledWith([
      'books:list:abc',
      'books:list:keys',
    ]);
  });

  it('throws not found when removing a missing book', async () => {
    bookModel.findByIdAndDelete.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.remove('507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('invalidates cached item and lists after removing a book', async () => {
    bookModel.findByIdAndDelete.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ id: '507f1f77bcf86cd799439011' }),
    });
    redisCacheService.getSetMembers.mockResolvedValue(['books:list:abc']);

    await service.remove('507f1f77bcf86cd799439011');

    expect(redisCacheService.delete).toHaveBeenCalledWith(
      'books:item:507f1f77bcf86cd799439011',
    );
    expect(redisCacheService.deleteMany).toHaveBeenCalledWith([
      'books:list:abc',
      'books:list:keys',
    ]);
  });
});
