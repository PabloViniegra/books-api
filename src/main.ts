import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfig } from './config/app-config';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  const configService = app.get<ConfigService<AppConfig, true>>(ConfigService);
  const port = configService.getOrThrow('PORT', { infer: true });

  await app.listen(port);
}

void bootstrap();
