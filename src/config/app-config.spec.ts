import { validateAppConfig } from './app-config';

describe('validateAppConfig', () => {
  const createBaseEnv = (): Record<string, unknown> => ({
    MONGODB_URI: 'mongodb://localhost:27017/books',
    GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
    JWT_SECRET: 'super-secret',
  });

  it('applies safe defaults for optional configuration', () => {
    expect(validateAppConfig(createBaseEnv())).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      MONGODB_URI: 'mongodb://localhost:27017/books',
      CACHE_TTL_SECONDS: 60,
      REDIS_RETRY_DELAY_MS: 5000,
      GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
      JWT_SECRET: 'super-secret',
      JWT_EXPIRES_IN: '1h',
      RATE_LIMIT_TTL: 60000,
      RATE_LIMIT_LIMIT: 100,
      ENABLE_BOOKS_SEED: true,
      ENABLE_GOOGLE_AUTH_TEST_PAGE: true,
    });
  });

  it('changes environment-based defaults outside development', () => {
    const config = validateAppConfig({
      ...createBaseEnv(),
      NODE_ENV: 'production',
    });

    expect(config.ENABLE_BOOKS_SEED).toBe(false);
    expect(config.ENABLE_GOOGLE_AUTH_TEST_PAGE).toBe(false);
  });

  it('rejects invalid numeric and boolean values', () => {
    expect(() =>
      validateAppConfig({
        ...createBaseEnv(),
        RATE_LIMIT_LIMIT: 'nope',
      }),
    ).toThrow('RATE_LIMIT_LIMIT must be a valid number');

    expect(() =>
      validateAppConfig({
        ...createBaseEnv(),
        ENABLE_BOOKS_SEED: 'sometimes',
      }),
    ).toThrow('ENABLE_BOOKS_SEED must be a boolean');
  });
});
