import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from 'redis';
import { RedisCacheService } from './redis-cache.service';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisCacheService', () => {
  let service: RedisCacheService;

  const mockedCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;

  const client = {
    isOpen: false,
    on: jest.fn(),
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    sAdd: jest.fn(),
    sMembers: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    client.isOpen = false;
    mockedCreateClient.mockReturnValue(client as never);
    configService.get.mockImplementation((key: string) => {
      if (key === 'REDIS_URL') {
        return 'redis://localhost:6379';
      }

      return undefined;
    });
    configService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'CACHE_TTL_SECONDS') {
        return 60;
      }

      if (key === 'REDIS_RETRY_DELAY_MS') {
        return 0;
      }

      throw new Error(`Unexpected config key: ${key}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
  });

  it('retries connecting after an initial Redis failure', async () => {
    client.connect
      .mockRejectedValueOnce(new Error('redis down'))
      .mockImplementationOnce(() => {
        client.isOpen = true;
        return Promise.resolve();
      });
    client.get.mockResolvedValue(JSON.stringify({ value: 'cached' }));

    await expect(service.get('books:item:1')).resolves.toBeNull();
    await expect(
      service.get<{ value: string }>('books:item:1'),
    ).resolves.toEqual({
      value: 'cached',
    });
    expect(client.connect).toHaveBeenCalledTimes(2);
  });

  it('disables cache cleanly when REDIS_URL is missing', async () => {
    configService.get.mockReturnValue(undefined);
    mockedCreateClient.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    const redisCacheService = module.get<RedisCacheService>(RedisCacheService);

    await expect(redisCacheService.get('books:item:1')).resolves.toBeNull();
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });
});
