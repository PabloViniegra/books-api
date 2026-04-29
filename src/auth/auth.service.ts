import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../config/app-config';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleTokenService } from './google-token.service';
import { ApiJwtPayload, AuthUser } from './types/auth-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly googleTokenService: GoogleTokenService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async loginWithGoogle(idToken: string): Promise<AuthResponseDto> {
    const user = await this.googleTokenService.verifyIdToken(idToken);
    const accessToken = await this.jwtService.signAsync(
      this.toJwtPayload(user),
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.getOrThrow('JWT_EXPIRES_IN', {
        infer: true,
      }),
      user,
    };
  }

  private toJwtPayload(user: AuthUser): ApiJwtPayload {
    return {
      sub: user.id,
      email: user.email,
      ...(user.name !== undefined ? { name: user.name } : {}),
      ...(user.picture !== undefined ? { picture: user.picture } : {}),
    };
  }
}
