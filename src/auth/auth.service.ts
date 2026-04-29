import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleTokenService } from './google-token.service';
import { ApiJwtPayload, AuthUser } from './types/auth-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly googleTokenService: GoogleTokenService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async loginWithGoogle(idToken: string): Promise<AuthResponseDto> {
    const user = await this.googleTokenService.verifyIdToken(idToken);
    const accessToken = await this.jwtService.signAsync(
      this.toJwtPayload(user),
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1h'),
      user,
    };
  }

  private toJwtPayload(user: AuthUser): ApiJwtPayload {
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
  }
}
