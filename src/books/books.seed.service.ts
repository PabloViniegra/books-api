import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BOOKS_SEED_DATA } from './books.seed';
import { Book } from './schemas/book.schema';

@Injectable()
export class BooksSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BooksSeedService.name);

  constructor(
    @InjectModel(Book.name) private readonly bookModel: Model<Book>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const booksCount = await this.bookModel.countDocuments().exec();

    if (booksCount > 0) {
      return;
    }

    await this.bookModel.insertMany(BOOKS_SEED_DATA);
    this.logger.log(`Seeded ${BOOKS_SEED_DATA.length} books`);
  }
}
