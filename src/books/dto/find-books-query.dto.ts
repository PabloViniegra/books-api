import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum BookSortBy {
  TITLE = 'title',
  AUTHOR = 'author',
  YEAR = 'year',
  GENRE = 'genre',
  PRICE = 'price',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class FindBooksQueryDto {
  @ApiPropertyOptional({ type: Number, example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: Number,
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({
    type: String,
    example: 'martin',
    description:
      'Case-insensitive partial match across title, author, genre, and isbn',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : undefined;
  })
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    type: String,
    enum: BookSortBy,
    default: BookSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(BookSortBy)
  sortBy: BookSortBy = BookSortBy.CREATED_AT;

  @ApiPropertyOptional({
    type: String,
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;
}
