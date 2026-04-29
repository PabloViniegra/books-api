import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { BOOKS_SEED_DATA } from './../src/books/books.seed';
import { setupApp } from './../src/setup-app';

jest.setTimeout(120000);

type BookResponse = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  price: number;
  genre?: string;
  year?: number;
};

type PaginatedBooksResponse = {
  items: BookResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type OpenApiDocumentResponse = {
  openapi: string;
  paths: Record<string, unknown>;
};

describe('BooksController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let httpServer: Parameters<typeof request>[0];
  let accessToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri('books-api-test');
    delete process.env.REDIS_URL;
    process.env.CACHE_TTL_SECONDS = '60';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.RATE_LIMIT_TTL = '60000';
    process.env.RATE_LIMIT_LIMIT = '100';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    accessToken = await moduleFixture.get(JwtService).signAsync({
      sub: 'google-user-id',
      email: 'reader@example.com',
    });

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];
  });

  it('serves the OpenAPI document', async () => {
    const response = await request(httpServer).get('/docs-json').expect(200);
    const openApiDocument = response.body as OpenApiDocumentResponse;

    expect(openApiDocument.openapi).toBeDefined();
    expect(openApiDocument.paths['/books']).toBeDefined();
    expect(openApiDocument.paths['/books/{id}']).toBeDefined();
  });

  it('serves the Google auth test page outside production', async () => {
    const response = await request(httpServer)
      .get('/auth/google/test')
      .expect('Content-Type', /html/)
      .expect(200);

    expect(response.text).toContain('Google Auth Test Page');
    expect(response.text).toContain(
      'test-client-id.apps.googleusercontent.com',
    );
  });

  it('loads seed data automatically on an empty database', async () => {
    const response = await request(httpServer).get('/books').expect(200);
    const booksResponse = response.body as PaginatedBooksResponse;

    expect(booksResponse.total).toBe(BOOKS_SEED_DATA.length);
    expect(booksResponse.page).toBe(1);
    expect(booksResponse.limit).toBe(10);
    expect(booksResponse.totalPages).toBe(
      Math.ceil(BOOKS_SEED_DATA.length / booksResponse.limit),
    );
    expect(booksResponse.items).toHaveLength(10);
    expect(booksResponse.hasNextPage).toBe(true);
    expect(booksResponse.hasPreviousPage).toBe(false);
  });

  it('runs the full books CRUD flow', async () => {
    const createResponse = await request(httpServer)
      .post('/books')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Release It!',
        author: 'Michael T. Nygard',
        year: 2007,
        genre: 'Software',
        isbn: '9780978739218',
        price: 33.5,
        url: 'https://example.com/books/release-it',
      })
      .expect(201);

    const createdBook = createResponse.body as BookResponse;

    expect(createdBook).toMatchObject({
      title: 'Release It!',
      author: 'Michael T. Nygard',
      isbn: '9780978739218',
    });

    const bookId = createdBook.id;

    const listResponse = await request(httpServer).get('/books').expect(200);
    const books = listResponse.body as PaginatedBooksResponse;

    expect(Array.isArray(books.items)).toBe(true);
    expect(books.total).toBe(BOOKS_SEED_DATA.length + 1);
    expect(books.items.some((book) => book.id === bookId)).toBe(true);

    const getResponse = await request(httpServer)
      .get(`/books/${bookId}`)
      .expect(200);
    const fetchedBook = getResponse.body as BookResponse;

    expect(fetchedBook.id).toBe(bookId);

    const updateResponse = await request(httpServer)
      .patch(`/books/${bookId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ price: 39.5 })
      .expect(200);
    const updatedBook = updateResponse.body as BookResponse;

    expect(updatedBook.price).toBe(39.5);

    await request(httpServer)
      .delete(`/books/${bookId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(httpServer).get(`/books/${bookId}`).expect(404);
  });

  it('supports search, sorting and pagination query params', async () => {
    const response = await request(httpServer)
      .get('/books')
      .query({
        search: 'martin',
        sortBy: 'title',
        sortOrder: 'asc',
        page: 1,
        limit: 5,
      })
      .expect(200);

    const books = response.body as PaginatedBooksResponse;

    expect(books.page).toBe(1);
    expect(books.limit).toBe(5);
    expect(books.total).toBeGreaterThanOrEqual(1);
    expect(books.items.length).toBeLessThanOrEqual(5);
    expect(
      books.items.every((book) => {
        const haystack =
          `${book.title} ${book.author} ${book.genre} ${book.isbn}`.toLowerCase();
        return haystack.includes('martin');
      }),
    ).toBe(true);

    const titles = books.items.map((book) => book.title);
    expect(titles).toEqual(
      [...titles].sort((left, right) => left.localeCompare(right)),
    );
  });

  it('rejects invalid listing query params', async () => {
    await request(httpServer)
      .get('/books')
      .query({ page: 0, sortOrder: 'up' })
      .expect(400);
  });

  it('requires authorization for write operations', async () => {
    await request(httpServer)
      .post('/books')
      .send({
        title: 'Unauthorized Book',
        author: 'Author',
        year: 2024,
        genre: 'Software',
        isbn: '9780000000001',
        price: 10,
        url: 'https://example.com/books/unauthorized',
      })
      .expect(401);

    await request(httpServer)
      .patch('/books/507f1f77bcf86cd799439011')
      .send({ price: 12 })
      .expect(401);

    await request(httpServer)
      .delete('/books/507f1f77bcf86cd799439011')
      .expect(401);
  });

  it('rate limits requests globally', async () => {
    const rateLimitedMongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = rateLimitedMongoServer.getUri(
      'books-api-rate-limit-test',
    );
    delete process.env.REDIS_URL;
    process.env.CACHE_TTL_SECONDS = '60';
    process.env.RATE_LIMIT_TTL = '60000';
    process.env.RATE_LIMIT_LIMIT = '1';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const rateLimitedApp = moduleFixture.createNestApplication();
    setupApp(rateLimitedApp);

    try {
      await rateLimitedApp.init();
      const rateLimitedHttpServer =
        rateLimitedApp.getHttpServer() as Parameters<typeof request>[0];

      await request(rateLimitedHttpServer).get('/books').expect(200);
      await request(rateLimitedHttpServer).get('/books').expect(429);
    } finally {
      await rateLimitedApp.close();
      await rateLimitedMongoServer.stop();
      process.env.MONGODB_URI = mongoServer.getUri('books-api-test');
      process.env.RATE_LIMIT_LIMIT = '100';
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (mongoServer) {
      await mongoServer.stop();
    }
  });
});
