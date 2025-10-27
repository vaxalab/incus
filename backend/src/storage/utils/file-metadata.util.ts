import sharp from 'sharp';
import { FileMetadata } from '../interfaces/storage.interface';

export class FileMetadataUtil {
  static async extractImageMetadata(
    buffer: Buffer,
    mimeType: string,
  ): Promise<Partial<FileMetadata>> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      return {
        width: metadata.width,
        height: metadata.height,
        mimeType,
        filesize: buffer.length,
      };
    } catch (error) {
      console.error('Error extracting image metadata:', error);
      return {
        filesize: buffer.length,
        mimeType,
      };
    }
  }

  static async extractAudioMetadata(
    buffer: Buffer,
    mimeType: string,
  ): Promise<Partial<FileMetadata>> {
    // For now, return basic metadata
    // In the future, you could use libraries like node-ffmpeg or music-metadata
    return {
      filesize: buffer.length,
      mimeType,
    };
  }

  static async extractVideoMetadata(
    buffer: Buffer,
    mimeType: string,
  ): Promise<Partial<FileMetadata>> {
    // For now, return basic metadata
    // In the future, you could use libraries like node-ffmpeg
    return {
      filesize: buffer.length,
      mimeType,
    };
  }

  static generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = this.getFileExtension(originalName);

    return `${timestamp}_${randomString}${extension}`;
  }

  static sanitizeFilename(filename: string): string {
    // Remove or replace unsafe characters
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
  }

  static getContentType(mimeType: string): string {
    // Map common MIME types to standardized content types
    const contentTypeMap: Record<string, string> = {
      'image/jpeg': 'image/jpeg',
      'image/png': 'image/png',
      'image/webp': 'image/webp',
      'image/gif': 'image/gif',
      'audio/mpeg': 'audio/mpeg',
      'audio/wav': 'audio/wav',
      'audio/flac': 'audio/flac',
      'video/mp4': 'video/mp4',
      'application/zip': 'application/zip',
    };

    return contentTypeMap[mimeType] || 'application/octet-stream';
  }

  static async resizeImage(
    buffer: Buffer,
    options: {
      width?: number;
      height?: number;
      quality?: number;
    },
  ): Promise<Buffer> {
    try {
      let image = sharp(buffer);

      if (options.width || options.height) {
        image = image.resize(options.width, options.height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      if (options.quality) {
        image = image.jpeg({ quality: options.quality });
      }

      return await image.toBuffer();
    } catch (error) {
      console.error('Error resizing image:', error);
      throw new Error('Failed to resize image');
    }
  }

  static async generateThumbnail(
    buffer: Buffer,
    size: { width: number; height: number } = { width: 300, height: 300 },
  ): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }
}
