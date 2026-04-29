import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ example: 'Cien anos de soledad' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Gabriel Garcia Marquez' })
  @IsString()
  @IsNotEmpty()
  author!: string;

  @ApiProperty({ example: 1967, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  year!: number;

  @ApiProperty({ example: 'Realismo magico' })
  @IsString()
  @IsNotEmpty()
  genre!: string;

  @ApiProperty({ example: '9780307474728' })
  @IsString()
  @IsNotEmpty()
  isbn!: string;

  @ApiProperty({ example: 19.99, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'https://example.com/books/cien-anos-de-soledad' })
  @IsUrl()
  url!: string;
}
