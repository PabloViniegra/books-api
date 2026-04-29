import { ApiProperty } from '@nestjs/swagger';
import { Book } from '../schemas/book.schema';

export class PaginatedBooksResponseDto {
  @ApiProperty({ type: Book, isArray: true })
  items!: Book[];

  @ApiProperty({ example: 28 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}
