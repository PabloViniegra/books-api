import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: '109876543210987654321' })
  id!: string;

  @ApiProperty({ example: 'reader@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Reader Example' })
  name?: string;

  @ApiPropertyOptional({
    example: 'https://lh3.googleusercontent.com/a/example',
  })
  picture?: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: '1h' })
  expiresIn!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
