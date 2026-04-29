import { Body, Controller, Get, Header, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthPageService } from './auth-page.service';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authPageService: AuthPageService,
  ) {}

  @ApiExcludeEndpoint()
  @Get('google/test')
  @Header('Content-Type', 'text/html; charset=utf-8')
  renderGoogleTestPage(): string {
    return this.authPageService.getGoogleTestPage();
  }

  @ApiOperation({
    summary: 'Exchange a Google ID token for an API access token',
  })
  @ApiOkResponse({
    description: 'Authenticated successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiUnauthorizedResponse({
    description: 'Invalid Google token or unverified email',
  })
  @Post('google')
  loginWithGoogle(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(googleLoginDto.idToken);
  }
}
