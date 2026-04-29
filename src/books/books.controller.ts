import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBookDto } from './dto/create-book.dto';
import {
  BookSortBy,
  FindBooksQueryDto,
  SortOrder,
} from './dto/find-books-query.dto';
import { PaginatedBooksResponseDto } from './dto/paginated-books-response.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BooksService } from './books.service';
import { Book } from './schemas/book.schema';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @ApiOperation({ summary: 'Create a book' })
  @ApiCreatedResponse({ description: 'Book created', type: Book })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiConflictResponse({ description: 'A book with that ISBN already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  @ApiOperation({ summary: 'List all books' })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    schema: { type: 'integer', default: 1, minimum: 1 },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    schema: { type: 'integer', default: 10, minimum: 1, maximum: 50 },
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'martin',
    schema: { type: 'string' },
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: BookSortBy,
    schema: { type: 'string', default: BookSortBy.CREATED_AT },
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: SortOrder,
    schema: { type: 'string', default: SortOrder.DESC },
  })
  @ApiOkResponse({
    description: 'Paginated books list',
    type: PaginatedBooksResponseDto,
  })
  @Get()
  findAll(@Query() query: FindBooksQueryDto) {
    return this.booksService.findAll(query);
  }

  @ApiOperation({ summary: 'Get a book by id' })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the book',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({ description: 'Book found', type: Book })
  @ApiBadRequestResponse({ description: 'Invalid book id' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a book' })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the book',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({ description: 'Book updated', type: Book })
  @ApiBadRequestResponse({ description: 'Invalid id or payload' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  @ApiConflictResponse({ description: 'A book with that ISBN already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    return this.booksService.update(id, updateBookDto);
  }

  @ApiOperation({ summary: 'Delete a book' })
  @ApiParam({
    name: 'id',
    description: 'MongoDB ObjectId of the book',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiNoContentResponse({ description: 'Book deleted' })
  @ApiBadRequestResponse({ description: 'Invalid book id' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.booksService.remove(id);
  }
}
