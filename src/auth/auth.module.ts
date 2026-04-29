import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AppConfig } from '../config/app-config';
import { AuthPageService } from './auth-page.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleTokenService } from './google-token.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<AppConfig, true>,
      ): JwtModuleOptions => {
        return {
          secret: configService.getOrThrow('JWT_SECRET', { infer: true }),
          signOptions: {
            expiresIn: configService.getOrThrow('JWT_EXPIRES_IN', {
              infer: true,
            }),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthPageService, AuthService, GoogleTokenService, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
