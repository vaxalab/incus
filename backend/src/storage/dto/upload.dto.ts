import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UploadImageDto {
  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  maxWidth?: number;

  @IsOptional()
  @IsNumber()
  maxHeight?: number;

  @IsOptional()
  @IsNumber()
  quality?: number;

  @IsOptional()
  @IsBoolean()
  generateThumbnail?: boolean;
}

export class UploadAudioDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UploadVideoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  generateThumbnail?: boolean;
}

export class UploadDownloadDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class PresignedUrlDto {
  @IsString()
  filename: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  fileType: 'image' | 'audio' | 'video' | 'download';
}
