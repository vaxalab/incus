import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class ImageOrderDto {
  @IsString()
  @IsNotEmpty()
  imageId: string;

  @Type(() => Number)
  order: number;
}

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  // For handling image ordering when images are uploaded
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageOrderDto)
  imageOrders?: ImageOrderDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
