import {
  IsString,
  IsOptional,
  IsUrl,
  IsNotEmpty,
  MaxLength,
  IsArray,
  ValidateNested,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ReleaseType } from '@prisma/client';

class ImageOrderDto {
  @IsString()
  @IsNotEmpty()
  imageId: string;

  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  order: number;
}

export class CreateReleaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayArtist: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsEnum(ReleaseType)
  type: ReleaseType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsUUID()
  artistId: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  spotifyUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  addToPlaylistUrl?: string;

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
  @IsUrl()
  @MaxLength(500)
  soundcloudUrl?: string;

  // For handling image ordering when images are uploaded
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageOrderDto)
  imageOrders?: ImageOrderDto[];
}
