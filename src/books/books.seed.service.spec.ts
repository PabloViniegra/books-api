import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { BooksSeedService } from './books.seed.service';
import { BOOKS_SEED_DATA } from './books.seed';
import { Book } from './schemas/book.schema';

describe('BooksSeedService', () => {
  let service: BooksSeedService;

  const countDocumentsExec = jest.fn();
  const countDocuments = jest.fn();
  const bookModel = {
    countDocuments,
    insertMany: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    countDocuments.mockReturnValue({ exec: countDocumentsExec });
    countDocumentsExec.mockResolvedValue(0);
    configService.getOrThrow.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksSeedService,
        {
          provide: getModelToken(Book.name),
          useValue: bookModel,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<BooksSeedService>(BooksSeedService);
  });

  it('skips seeding when the seed flag is disabled', async () => {
    configService.getOrThrow.mockReturnValue(false);

    await service.onApplicationBootstrap();

    expect(countDocuments).not.toHaveBeenCalled();
    expect(bookModel.insertMany).not.toHaveBeenCalled();
  });

  it('skips seeding when the collection already has data', async () => {
    countDocumentsExec.mockResolvedValue(2);

    await service.onApplicationBootstrap();

    expect(bookModel.insertMany).not.toHaveBeenCalled();
  });

  it('seeds the catalog when enabled and the collection is empty', async () => {
    await service.onApplicationBootstrap();

    expect(bookModel.insertMany).toHaveBeenCalledWith(BOOKS_SEED_DATA);
  });
});
