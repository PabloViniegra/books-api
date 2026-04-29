import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BookDocument = HydratedDocument<Book>;

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: { _id?: { toString(): string }; id?: string }) => {
      if (ret._id) {
        ret.id = ret._id.toString();
      }

      delete ret._id;
      return ret;
    },
  },
})
export class Book {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: 'Cien anos de soledad' })
  @Prop({ required: true, trim: true })
  title!: string;

  @ApiProperty({ example: 'Gabriel Garcia Marquez' })
  @Prop({ required: true, trim: true })
  author!: string;

  @ApiProperty({ example: 1967, minimum: 1 })
  @Prop({ required: true, min: 1 })
  year!: number;

  @ApiProperty({ example: 'Realismo magico' })
  @Prop({ required: true, trim: true })
  genre!: string;

  @ApiProperty({ example: '9780307474728' })
  @Prop({ required: true, trim: true, unique: true })
  isbn!: string;

  @ApiProperty({ example: 19.99, minimum: 0 })
  @Prop({ required: true, min: 0 })
  price!: number;

  @ApiProperty({ example: 'https://example.com/books/cien-anos-de-soledad' })
  @Prop({ required: true, trim: true })
  url!: string;

  @ApiProperty({ example: '2026-04-29T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-29T12:00:00.000Z' })
  updatedAt!: Date;
}

export const BookSchema = SchemaFactory.createForClass(Book);
