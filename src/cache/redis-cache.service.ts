import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';
import { AppConfig } from '../config/app-config';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly ttlSeconds: number;
  private readonly retryDelayMs: number;
  private readonly client: RedisClientType | null;
  private connectionPromise: Promise<RedisClientType | null> | null = null;
  private nextReconnectAt = 0;
  private cacheDisabled = false;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    this.ttlSeconds = this.configService.getOrThrow('CACHE_TTL_SECONDS', {
      infer: true,
    });
    this.retryDelayMs = this.configService.getOrThrow('REDIS_RETRY_DELAY_MS', {
      infer: true,
    });

    const redisUrl = this.configService.get('REDIS_URL', { infer: true });

    if (!redisUrl) {
      this.client = null;
      this.cacheDisabled = true;
      this.logger.warn('REDIS_URL is not configured. Redis cache is disabled.');
      return;
    }

    this.client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 1000,
        reconnectStrategy: false,
      },
    });

    this.client.on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Redis cache error: ${message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();

    if (!client) {
      return null;
    }

    try {
      const value = await client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds = this.ttlSeconds,
  ): Promise<void> {
    const client = await this.getClient();

    if (!client) {
      return;
    }

    try {
      await client.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
    } catch {
      return;
    }
  }

  async addToSet(key: string, member: string): Promise<void> {
    const client = await this.getClient();

    if (!client) {
      return;
    }

    try {
      await client.sAdd(key, member);
    } catch {
      return;
    }
  }

  async getSetMembers(key: string): Promise<string[]> {
    const client = await this.getClient();

    if (!client) {
      return [];
    }

    try {
      return await client.sMembers(key);
    } catch {
      return [];
    }
  }

  async delete(key: string): Promise<void> {
    await this.deleteMany([key]);
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const client = await this.getClient();

    if (!client) {
      return;
    }

    try {
      await client.del(keys);
    } catch {
      return;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client?.isOpen) {
      return;
    }

    await this.client.quit();
  }

  private async getClient(): Promise<RedisClientType | null> {
    if (this.cacheDisabled || !this.client) {
      return null;
    }

    if (this.client.isOpen) {
      return this.client;
    }

    if (Date.now() < this.nextReconnectAt) {
      return null;
    }

    if (!this.connectionPromise) {
      this.connectionPromise = this.client
        .connect()
        .then(() => {
          this.nextReconnectAt = 0;
          return this.client;
        })
        .catch((error: Error) => {
          this.nextReconnectAt = Date.now() + this.retryDelayMs;
          this.logger.warn(
            `Unable to connect to Redis. Retrying in ${this.retryDelayMs}ms: ${error.message}`,
          );
          return null;
        })
        .finally(() => {
          this.connectionPromise = null;
        });
    }

    return this.connectionPromise;
  }
}
