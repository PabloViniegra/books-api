import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { GoogleTokenService } from './google-token.service';

describe('AuthService', () => {
  let service: AuthService;

  const googleTokenService = {
    verifyIdToken: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService.getOrThrow.mockReturnValue('1h');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: GoogleTokenService, useValue: googleTokenService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('exchanges a verified Google token for an API access token', async () => {
    const user = {
      id: 'google-user-id',
      email: 'reader@example.com',
      name: 'Reader Example',
      picture: 'https://example.com/avatar.png',
    };

    googleTokenService.verifyIdToken.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue('api-access-token');

    await expect(service.loginWithGoogle('google-id-token')).resolves.toEqual({
      accessToken: 'api-access-token',
      tokenType: 'Bearer',
      expiresIn: '1h',
      user,
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    });
  });

  it('does not issue a token when Google validation fails', async () => {
    googleTokenService.verifyIdToken.mockRejectedValue(
      new UnauthorizedException('Invalid Google token'),
    );

    await expect(
      service.loginWithGoogle('invalid-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
