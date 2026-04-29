import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthPageService } from './auth-page.service';

describe('AuthPageService', () => {
  let service: AuthPageService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') {
          return 'development';
        }

        if (key === 'GOOGLE_CLIENT_ID') {
          return 'test-client-id.apps.googleusercontent.com';
        }

        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPageService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthPageService>(AuthPageService);
  });

  it('returns the Google auth test page outside production', () => {
    const html = service.getGoogleTestPage();

    expect(html).toContain('Google Auth Test Page');
    expect(html).toContain('test-client-id.apps.googleusercontent.com');
    expect(html).toContain('/auth/google');
  });

  it('returns not found in production', () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'production';
      }

      if (key === 'GOOGLE_CLIENT_ID') {
        return 'test-client-id.apps.googleusercontent.com';
      }

      return undefined;
    });

    expect(() => service.getGoogleTestPage()).toThrow(NotFoundException);
  });

  it('fails when GOOGLE_CLIENT_ID is missing', () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'development';
      }

      return undefined;
    });

    expect(() => service.getGoogleTestPage()).toThrow(
      InternalServerErrorException,
    );
  });
});
