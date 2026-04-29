import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { AppConfig } from '../config/app-config';
import { AuthUser } from './types/auth-user';

@Injectable()
export class GoogleTokenService {
  private readonly client = new OAuth2Client();

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async verifyIdToken(idToken: string): Promise<AuthUser> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.configService.getOrThrow('GOOGLE_CLIENT_ID', {
          infer: true,
        }),
      });
      const payload = ticket.getPayload();

      return this.toAuthUser(payload);
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private toAuthUser(payload?: TokenPayload): AuthUser {
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Google token payload');
    }

    if (payload.email_verified !== true) {
      throw new UnauthorizedException('Google email is not verified');
    }

    return {
      id: payload.sub,
      email: payload.email,
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.picture !== undefined ? { picture: payload.picture } : {}),
    };
  }
}
