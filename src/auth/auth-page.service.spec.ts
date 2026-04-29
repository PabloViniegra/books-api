import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthPageService } from './auth-page.service';

describe('AuthPageService', () => {
  let service: AuthPageService;
  let configService: { getOrThrow: jest.Mock };

  beforeEach(async () => {
    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'ENABLE_GOOGLE_AUTH_TEST_PAGE') {
          return true;
        }

        if (key === 'GOOGLE_CLIENT_ID') {
          return 'test-client-id.apps.googleusercontent.com';
        }

        throw new Error(`Unexpected config key: ${key}`);
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

  it('returns not found when the helper page is disabled', () => {
    configService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'ENABLE_GOOGLE_AUTH_TEST_PAGE') {
        return false;
      }

      if (key === 'GOOGLE_CLIENT_ID') {
        return 'test-client-id.apps.googleusercontent.com';
      }

      throw new Error(`Unexpected config key: ${key}`);
    });

    expect(() => service.getGoogleTestPage()).toThrow(NotFoundException);
  });
});
