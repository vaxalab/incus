import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DatabaseService } from '../database/database.service';
import {
  FileType,
  UploadResult,
  PresignedUrlResult,
  FileProcessingOptions,
} from './interfaces/storage.interface';
import { FileMetadataUtil } from '../utils/file-metadata.util';
import { ImageCompressionUtil } from '../utils/image-compression.util';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly buckets: Record<FileType, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    // Initialize S3 client
    const endpoint = this.configService.get<string>('STORAGE_ENDPOINT');
    const region = this.configService.get<string>(
      'STORAGE_REGION',
      'us-east-1',
    );
    const accessKeyId = this.configService.get<string>('STORAGE_ACCESS_KEY');
    const secretAccessKey =
      this.configService.get<string>('STORAGE_SECRET_KEY');

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO
    });

    // Map file types to buckets
    this.buckets = {
      [FileType.IMAGE]: this.configService.get<string>(
        'STORAGE_BUCKET_IMAGES',
        'incus-images',
      ),
      [FileType.AUDIO]: this.configService.get<string>(
        'STORAGE_BUCKET_AUDIO',
        'incus-audio',
      ),
      [FileType.DOWNLOAD]: this.configService.get<string>(
        'STORAGE_BUCKET_DOWNLOADS',
        'incus-downloads',
      ),
    };
  }

  async uploadImage(
    file: Express.Multer.File,
    options?: FileProcessingOptions,
    folder = 'images',
  ): Promise<UploadResult> {
    // Compress image with optional resizing
    const compressionResult = await ImageCompressionUtil.compressImage(
      file.buffer,
      file.mimetype,
      file.originalname,
      options,
    );

    // Extract metadata from processed image
    const metadata = await FileMetadataUtil.getImageMetadata(
      compressionResult.buffer,
    );

    // Generate unique filename
    const filename = FileMetadataUtil.generateUniqueFilename(file.originalname);
    const key = `${folder}/${filename}`;

    // Upload to S3
    const bucketName = this.buckets[FileType.IMAGE];
    await this.uploadToS3(
      bucketName,
      key,
      compressionResult.buffer,
      compressionResult.mimeType,
    );

    // Save to database
    const image = await this.databaseService.image.create({
      data: {
        filename,
        originalName: file.originalname,
        alt: '',
        width: metadata.width,
        height: metadata.height,
        filesize: compressionResult.compressedSize,
        mimeType: compressionResult.mimeType,
        bucketName,
        key,
        url: this.generatePublicUrl(bucketName, key),
      },
    });

    return {
      id: image.id,
      filename: image.filename,
      originalName: image.originalName,
      mimeType: image.mimeType || '',
      filesize: image.filesize || 0,
      bucketName: image.bucketName,
      key: image.key,
      url: image.url,
      metadata,
    };
  }

  async uploadAudio(
    file: Express.Multer.File,
    isPublic = false,
  ): Promise<UploadResult> {
    // Extract metadata
    const metadata = await FileMetadataUtil.getAudioMetadata(
      file.buffer,
      file.originalname,
    );

    // Generate unique filename
    const filename = FileMetadataUtil.generateUniqueFilename(file.originalname);
    const key = `audio/${filename}`;

    // Upload to S3
    const bucketName = this.buckets[FileType.AUDIO];
    await this.uploadToS3(bucketName, key, file.buffer, file.mimetype);

    // Save to database
    const audioFile = await this.databaseService.audioFile.create({
      data: {
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        filesize: file.size,
        duration: metadata.duration,
        bitrate: metadata.bitrate,
        sampleRate: metadata.sampleRate,
        bucketName,
        key,
        url: this.generatePublicUrl(bucketName, key),
        isPublic,
      },
    });

    return {
      id: audioFile.id,
      filename: audioFile.filename,
      originalName: audioFile.originalName,
      mimeType: audioFile.mimeType,
      filesize: audioFile.filesize,
      bucketName: audioFile.bucketName,
      key: audioFile.key,
      url: audioFile.url,
      metadata,
    };
  }

  async uploadDownload(file: Express.Multer.File): Promise<UploadResult> {
    // Generate unique filename
    const filename = FileMetadataUtil.generateUniqueFilename(file.originalname);
    const key = `downloads/${filename}`;

    // Upload to S3
    const bucketName = this.buckets[FileType.DOWNLOAD];
    await this.uploadToS3(bucketName, key, file.buffer, file.mimetype);

    // Save to database
    const downloadFile = await this.databaseService.downloadFile.create({
      data: {
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        filesize: file.size,
        bucketName,
        key,
        url: this.generatePrivateUrl(bucketName, key),
      },
    });

    return {
      id: downloadFile.id,
      filename: downloadFile.filename,
      originalName: downloadFile.originalName,
      mimeType: downloadFile.mimeType,
      filesize: downloadFile.filesize,
      bucketName: downloadFile.bucketName,
      key: downloadFile.key,
      url: downloadFile.url,
    };
  }

  async generatePresignedUploadUrl(
    fileType: FileType,
    filename: string,
    mimeType: string,
    expiresIn = 3600,
  ): Promise<PresignedUrlResult> {
    const bucketName = this.buckets[fileType];
    const key = `${fileType}/${FileMetadataUtil.generateUniqueFilename(filename)}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    return {
      uploadUrl,
      key,
      expiresIn,
    };
  }

  async getFile(bucketName: string, key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      if (response.Body) {
        // Handle streaming response
        const stream = response.Body as any;
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(
        `Error getting file ${key} from bucket ${bucketName}:`,
        error,
      );
      throw new Error('Failed to retrieve file');
    }
  }

  async getFileRange(
    bucketName: string,
    key: string,
    start: number,
    end?: number,
  ): Promise<{ buffer: Buffer; contentLength: number; totalSize: number }> {
    try {
      // First get file metadata to know the total size
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const headResponse = await this.s3Client.send(headCommand);
      const totalSize = headResponse.ContentLength || 0;

      // Calculate the actual end byte
      const actualEnd =
        end !== undefined ? Math.min(end, totalSize - 1) : totalSize - 1;

      // Build the Range header
      const range = `bytes=${start}-${actualEnd}`;

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        Range: range,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      if (response.Body) {
        const stream = response.Body as any;
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      }

      return {
        buffer: Buffer.concat(chunks),
        contentLength: response.ContentLength || 0,
        totalSize,
      };
    } catch (error) {
      this.logger.error(
        `Error getting file range ${key} from bucket ${bucketName}:`,
        error,
      );
      throw new Error('Failed to retrieve file range');
    }
  }

  async deleteFile(bucketName: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted file ${key} from bucket ${bucketName}`);
    } catch (error) {
      this.logger.error(
        `Error deleting file ${key} from bucket ${bucketName}:`,
        error,
      );
      throw new Error('Failed to delete file');
    }
  }

  async fileExists(bucketName: string, key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  private async uploadToS3(
    bucketName: string,
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      this.logger.log(`Uploaded file ${key} to bucket ${bucketName}`);
    } catch (error) {
      this.logger.error(
        `Error uploading file ${key} to bucket ${bucketName}:`,
        error,
      );
      throw new Error('Failed to upload file');
    }
  }

  private generatePublicUrl(bucketName: string, key: string): string {
    const publicUrl = this.configService.get<string>('STORAGE_PUBLIC_URL');
    return `${publicUrl}/${bucketName}/${key}`;
  }

  private generatePrivateUrl(bucketName: string, key: string): string {
    // For private files, we'll generate signed URLs when needed
    return `private://${bucketName}/${key}`;
  }

  // Public methods for accessing files from controllers
  async findAudioFileById(id: string) {
    return await this.databaseService.audioFile.findUnique({
      where: { id },
    });
  }

  async findDownloadFileById(id: string) {
    return await this.databaseService.downloadFile.findUnique({
      where: { id },
    });
  }

  async findImageById(id: string) {
    return await this.databaseService.image.findUnique({
      where: { id },
    });
  }
}
