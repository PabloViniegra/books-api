type NodeEnv = 'development' | 'test' | 'production';
type EnvInput = Record<string, unknown>;
type ReadNumberOptions = {
  defaultValue?: number;
  integer?: boolean;
  min?: number;
  max?: number;
};

export interface AppConfig {
  NODE_ENV: NodeEnv;
  PORT: number;
  MONGODB_URI: string;
  REDIS_URL?: string;
  CACHE_TTL_SECONDS: number;
  REDIS_RETRY_DELAY_MS: number;
  GOOGLE_CLIENT_ID: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  RATE_LIMIT_TTL: number;
  RATE_LIMIT_LIMIT: number;
  ENABLE_BOOKS_SEED: boolean;
  ENABLE_GOOGLE_AUTH_TEST_PAGE: boolean;
}

export function validateAppConfig(config: EnvInput): AppConfig {
  const nodeEnv = readNodeEnv(config, 'NODE_ENV', 'development');
  const redisUrl = readOptionalString(config, 'REDIS_URL');

  return {
    NODE_ENV: nodeEnv,
    PORT: readNumber(config, 'PORT', {
      defaultValue: 3000,
      integer: true,
      min: 1,
      max: 65535,
    }),
    MONGODB_URI: readString(config, 'MONGODB_URI'),
    ...(redisUrl !== undefined ? { REDIS_URL: redisUrl } : {}),
    CACHE_TTL_SECONDS: readNumber(config, 'CACHE_TTL_SECONDS', {
      defaultValue: 60,
      integer: true,
      min: 1,
    }),
    REDIS_RETRY_DELAY_MS: readNumber(config, 'REDIS_RETRY_DELAY_MS', {
      defaultValue: 5000,
      integer: true,
      min: 0,
    }),
    GOOGLE_CLIENT_ID: readString(config, 'GOOGLE_CLIENT_ID'),
    JWT_SECRET: readString(config, 'JWT_SECRET'),
    JWT_EXPIRES_IN: readJwtExpiresIn(config, 'JWT_EXPIRES_IN', '1h'),
    RATE_LIMIT_TTL: readNumber(config, 'RATE_LIMIT_TTL', {
      defaultValue: 60000,
      integer: true,
      min: 1,
    }),
    RATE_LIMIT_LIMIT: readNumber(config, 'RATE_LIMIT_LIMIT', {
      defaultValue: 100,
      integer: true,
      min: 1,
    }),
    ENABLE_BOOKS_SEED: readBoolean(
      config,
      'ENABLE_BOOKS_SEED',
      nodeEnv === 'development' || nodeEnv === 'test',
    ),
    ENABLE_GOOGLE_AUTH_TEST_PAGE: readBoolean(
      config,
      'ENABLE_GOOGLE_AUTH_TEST_PAGE',
      nodeEnv === 'development',
    ),
  };
}

function readNodeEnv(
  config: EnvInput,
  key: string,
  defaultValue: NodeEnv,
): NodeEnv {
  const value = readOptionalString(config, key);

  if (!value) {
    return defaultValue;
  }

  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }

  throw new Error(`${key} must be one of: development, test, production`);
}

function readString(
  config: EnvInput,
  key: string,
  defaultValue?: string,
): string {
  const value = readOptionalString(config, key);

  if (value !== undefined) {
    return value;
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`${key} is required`);
}

function readOptionalString(config: EnvInput, key: string): string | undefined {
  const rawValue = config[key];

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return undefined;
  }

  if (typeof rawValue !== 'string') {
    throw new Error(`${key} must be a string`);
  }

  const trimmedValue = rawValue.trim();

  if (trimmedValue.length === 0) {
    return undefined;
  }

  return trimmedValue;
}

function readNumber(
  config: EnvInput,
  key: string,
  options: ReadNumberOptions = {},
): number {
  const rawValue = config[key];

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }

    throw new Error(`${key} is required`);
  }

  const parsedValue =
    typeof rawValue === 'number'
      ? rawValue
      : typeof rawValue === 'string'
        ? Number(rawValue)
        : Number.NaN;

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${key} must be a valid number`);
  }

  if (options.integer === true && !Number.isInteger(parsedValue)) {
    throw new Error(`${key} must be an integer`);
  }

  if (options.min !== undefined && parsedValue < options.min) {
    throw new Error(`${key} must be greater than or equal to ${options.min}`);
  }

  if (options.max !== undefined && parsedValue > options.max) {
    throw new Error(`${key} must be less than or equal to ${options.max}`);
  }

  return parsedValue;
}

function readBoolean(
  config: EnvInput,
  key: string,
  defaultValue: boolean,
): boolean {
  const rawValue = config[key];

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return defaultValue;
  }

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'number') {
    if (rawValue === 1) {
      return true;
    }

    if (rawValue === 0) {
      return false;
    }

    throw new Error(`${key} must be a boolean`);
  }

  if (typeof rawValue !== 'string') {
    throw new Error(`${key} must be a boolean`);
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (normalizedValue === 'true' || normalizedValue === '1') {
    return true;
  }

  if (normalizedValue === 'false' || normalizedValue === '0') {
    return false;
  }

  throw new Error(`${key} must be a boolean`);
}

function readJwtExpiresIn(
  config: EnvInput,
  key: string,
  defaultValue: string,
): string {
  return readString(config, key, defaultValue);
}
