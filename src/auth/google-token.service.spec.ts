import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GoogleTokenService } from './google-token.service';

describe('GoogleTokenService', () => {
  let service: GoogleTokenService;

  const setGooglePayload = (payload: unknown): void => {
    Object.defineProperty(service, 'client', {
      configurable: true,
      value: {
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => payload,
        }),
      },
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleTokenService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest
              .fn()
              .mockReturnValue('client-id.apps.googleusercontent.com'),
          },
        },
      ],
    }).compile();

    service = module.get<GoogleTokenService>(GoogleTokenService);
  });

  it('rejects invalid Google tokens', async () => {
    await expect(service.verifyIdToken('invalid-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects Google tokens with unverified email addresses', async () => {
    setGooglePayload({
      sub: 'google-user-id',
      email: 'reader@example.com',
      email_verified: false,
    });

    await expect(
      service.verifyIdToken('google-id-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps verified Google token payloads to auth users', async () => {
    setGooglePayload({
      sub: 'google-user-id',
      email: 'reader@example.com',
      email_verified: true,
      name: 'Reader Example',
      picture: 'https://example.com/avatar.png',
    });

    await expect(service.verifyIdToken('google-id-token')).resolves.toEqual({
      id: 'google-user-id',
      email: 'reader@example.com',
      name: 'Reader Example',
      picture: 'https://example.com/avatar.png',
    });
  });
});
