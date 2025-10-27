import sharp from 'sharp';
import { parseBuffer } from 'music-metadata';
import { extname } from 'path';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface AudioMetadata {
  duration: number; // in seconds
  bitrate: number; // in kbps
  sampleRate: number; // in Hz
  format: string;
  size: number;
}

export class FileMetadataUtil {
  /**
   * Extract metadata from an image file
   */
  static async getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(`Failed to extract image metadata: ${error.message}`);
    }
  }

  /**
   * Extract metadata from an audio file
   */
  static async getAudioMetadata(
    buffer: Buffer,
    originalName: string,
  ): Promise<AudioMetadata> {
    try {
      // Parse audio metadata from buffer
      const metadata = await parseBuffer(buffer);

      const duration = metadata.format.duration || 0;
      const bitrate = metadata.format.bitrate || 0;
      const sampleRate = metadata.format.sampleRate || 0;
      const format = extname(originalName).toLowerCase().replace('.', '');

      return {
        duration: Math.round(duration),
        bitrate,
        sampleRate,
        format,
        size: buffer.length,
      };
    } catch (error) {
      throw new Error(`Failed to extract audio metadata: ${error.message}`);
    }
  }

  /**
   * Check if a file is an image based on MIME type
   */
  static isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  /**
   * Check if a file is an audio file based on MIME type
   */
  static isAudioFile(mimetype: string): boolean {
    return mimetype.startsWith('audio/');
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    return extname(filename).toLowerCase();
  }

  /**
   * Generate a unique filename with timestamp
   */
  static generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const extension = this.getFileExtension(originalName);
    const nameWithoutExt = originalName.replace(extension, '');

    return `${nameWithoutExt}-${timestamp}${extension}`;
  }
}
