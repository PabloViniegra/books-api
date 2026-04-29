import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { RedisCacheModule } from './cache/redis-cache.module';
import { AppConfig, validateAppConfig } from './config/app-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateAppConfig,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => [
        {
          ttl: configService.getOrThrow('RATE_LIMIT_TTL', { infer: true }),
          limit: configService.getOrThrow('RATE_LIMIT_LIMIT', { infer: true }),
        },
      ],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        uri: configService.getOrThrow('MONGODB_URI', { infer: true }),
      }),
    }),
    RedisCacheModule,
    AuthModule,
    BooksModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
