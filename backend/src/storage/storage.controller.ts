import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Response,
  Request,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { StorageService } from './storage.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import {
  UploadImageDto,
  UploadAudioDto,
  PresignedUrlDto,
} from './dto/upload.dto';
import { FileProcessingOptions } from './interfaces/storage.interface';
import {
  IMAGE_UPLOAD_CONFIG,
  AUDIO_UPLOAD_CONFIG,
} from './interfaces/upload-config.interface';
import { FileType } from './interfaces/storage.interface';

@Controller('storage')
@UseGuards(AuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('images/upload')
  @Roles('ADMIN', 'CUSTOMER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(new FileValidationPipe(IMAGE_UPLOAD_CONFIG))
    file: Express.Multer.File,
    @Body() uploadDto: UploadImageDto,
  ) {
    console.log('body', uploadDto);
    console.log('file', file);
    const processingOptions: FileProcessingOptions | undefined = uploadDto
      ? {
          maxWidth: uploadDto.maxWidth,
          maxHeight: uploadDto.maxHeight,
          quality: uploadDto.quality,
        }
      : undefined;

    return await this.storageService.uploadImage(file, processingOptions);
  }

  @Post('audio/upload')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(
    @UploadedFile(new FileValidationPipe(AUDIO_UPLOAD_CONFIG))
    file: Express.Multer.File,
    @Body() uploadDto: UploadAudioDto,
  ) {
    return await this.storageService.uploadAudio(file, uploadDto.isPublic);
  }

  @Post('presigned-url')
  @Roles('ADMIN', 'CUSTOMER')
  async generatePresignedUrl(@Body() presignedUrlDto: PresignedUrlDto) {
    return await this.storageService.generatePresignedUploadUrl(
      presignedUrlDto.fileType as FileType,
      presignedUrlDto.filename,
      presignedUrlDto.mimeType,
    );
  }

  @Get('images/:id')
  async getImage(
    @Param('id') id: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    // Get image from database
    const image = await this.storageService.findImageById(id);

    if (!image) {
      res.status(404);
      return { error: 'Image not found' };
    }

    try {
      // Get file from S3/MinIO
      const fileBuffer = await this.storageService.getFile(
        image.bucketName,
        image.key,
      );

      // Set appropriate headers for images
      res.set({
        'Content-Type': image.mimeType || 'image/jpeg',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        ETag: `"${image.id}"`,
        'Last-Modified':
          image.updatedAt?.toUTCString() || new Date().toUTCString(),
      });

      return new StreamableFile(fileBuffer);
    } catch {
      res.status(500);
      return { error: 'Failed to serve image' };
    }
  }

  @Get('audio/:id/stream')
  @UseGuards(OptionalAuthGuard)
  async streamAudio(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    // Get audio file from database
    const audioFile = await this.storageService.findAudioFileById(id);

    if (!audioFile) {
      res.status(404);
      return { error: 'Audio file not found' };
    }

    // Check if file is public or user has access
    if (!audioFile.isPublic) {
      // Check if user is authenticated for private files
      const user = req.user;
      if (!user) {
        res.status(401);
        return { error: 'Authentication required for private audio files' };
      }
      // Add additional authorization checks here (user role, ownership, etc.)
    }

    try {
      const range = req.headers.range;

      if (range) {
        // Handle Range request for seeking
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : undefined;

        const { buffer, contentLength, totalSize } =
          await this.storageService.getFileRange(
            audioFile.bucketName,
            audioFile.key,
            start,
            end,
          );

        const actualEnd = end !== undefined ? end : totalSize - 1;

        // Set headers for partial content
        res.status(206);
        res.set({
          'Content-Type': audioFile.mimeType,
          'Content-Length': contentLength.toString(),
          'Content-Range': `bytes ${start}-${actualEnd}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        });

        return new StreamableFile(buffer);
      } else {
        // Handle full file request
        const fileBuffer = await this.storageService.getFile(
          audioFile.bucketName,
          audioFile.key,
        );

        // Set appropriate headers for streaming
        res.set({
          'Content-Type': audioFile.mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        });

        return new StreamableFile(fileBuffer);
      }
    } catch {
      res.status(500);
      return { error: 'Failed to stream audio file' };
    }
  }

  @Get('downloads/:id')
  @Roles('ADMIN', 'CUSTOMER')
  async getDownloadFile(
    @Param('id') id: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    // Get download file from database
    const downloadFile = await this.storageService.findDownloadFileById(id);

    if (!downloadFile) {
      res.status(404);
      return { error: 'Download file not found' };
    }

    // Add authorization checks here
    // Check if user has purchased this file, etc.

    try {
      // Get file from S3
      const fileBuffer = await this.storageService.getFile(
        downloadFile.bucketName,
        downloadFile.key,
      );

      // Set headers for download
      res.set({
        'Content-Type': downloadFile.mimeType,
        'Content-Disposition': `attachment; filename="${downloadFile.originalName}"`,
        'Content-Length': fileBuffer.length.toString(),
      });

      return new StreamableFile(fileBuffer);
    } catch {
      res.status(500);
      return { error: 'Failed to retrieve download file' };
    }
  }
}
