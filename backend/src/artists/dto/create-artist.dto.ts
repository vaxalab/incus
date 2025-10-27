import {
  IsString,
  IsOptional,
  IsUrl,
  IsNotEmpty,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class ImageOrderDto {
  @IsString()
  @IsNotEmpty()
  imageId: string;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  order: number;
}

export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  twitter?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  spotify?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  appleMusicUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  youtubeUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  youtubeMusicUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  soundcloud?: string;

  // For handling image ordering when images are uploaded
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageOrderDto)
  imageOrders?: ImageOrderDto[];
}
