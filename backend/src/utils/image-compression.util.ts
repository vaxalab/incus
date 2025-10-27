import sharp from 'sharp';
import { Logger } from '@nestjs/common';
import { FileProcessingOptions } from '../storage/interfaces/storage.interface';

export interface CompressionResult {
  buffer: Buffer;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export class ImageCompressionUtil {
  private static readonly logger = new Logger(ImageCompressionUtil.name);

  /**
   * Compresses an image buffer with optional resizing and format optimization
   */
  static async compressImage(
    inputBuffer: Buffer,
    originalMimeType: string,
    originalName: string,
    options?: FileProcessingOptions,
  ): Promise<CompressionResult> {
    try {
      let sharpInstance = sharp(inputBuffer);
      let outputMimeType = originalMimeType;

      // Apply resizing if specified
      if (options?.maxWidth || options?.maxHeight) {
        sharpInstance = sharpInstance.resize(
          options.maxWidth,
          options.maxHeight,
          {
            fit: 'inside',
            withoutEnlargement: true,
          },
        );
      }

      // Apply compression based on file type
      if (this.isJpegFormat(originalMimeType)) {
        sharpInstance = this.applyJpegCompression(sharpInstance, options);
        outputMimeType = 'image/jpeg';
      } else if (this.isPngFormat(originalMimeType)) {
        sharpInstance = this.applyPngCompression(sharpInstance, options);
        outputMimeType = 'image/png';
      } else if (this.isWebpFormat(originalMimeType)) {
        sharpInstance = this.applyWebpCompression(sharpInstance, options);
        outputMimeType = 'image/webp';
      } else {
        // For other formats, convert to JPEG with compression
        sharpInstance = this.applyJpegCompression(sharpInstance, options);
        outputMimeType = 'image/jpeg';
      }

      const compressedBuffer = await sharpInstance.toBuffer();
      const compressionRatio = this.calculateCompressionRatio(
        inputBuffer.length,
        compressedBuffer.length,
      );

      this.logCompressionResults(
        originalName,
        inputBuffer.length,
        compressedBuffer.length,
        compressionRatio,
      );

      return {
        buffer: compressedBuffer,
        mimeType: outputMimeType,
        originalSize: inputBuffer.length,
        compressedSize: compressedBuffer.length,
        compressionRatio,
      };
    } catch (error) {
      this.logger.error(
        `Error compressing image ${originalName} with Sharp:`,
        error,
      );

      // Return original buffer if compression fails
      return {
        buffer: inputBuffer,
        mimeType: originalMimeType,
        originalSize: inputBuffer.length,
        compressedSize: inputBuffer.length,
        compressionRatio: 0,
      };
    }
  }

  /**
   * Apply JPEG compression settings
   */
  private static applyJpegCompression(
    sharpInstance: sharp.Sharp,
    options?: FileProcessingOptions,
  ): sharp.Sharp {
    return sharpInstance.jpeg({
      quality: options?.quality || 85,
      progressive: true,
      mozjpeg: true, // Better compression algorithm
    });
  }

  /**
   * Apply PNG compression settings
   */
  private static applyPngCompression(
    sharpInstance: sharp.Sharp,
    options?: FileProcessingOptions,
  ): sharp.Sharp {
    return sharpInstance.png({
      quality: options?.quality || 90,
      compressionLevel: 8,
      palette: true, // Use palette when beneficial for smaller files
    });
  }

  /**
   * Apply WebP compression settings
   */
  private static applyWebpCompression(
    sharpInstance: sharp.Sharp,
    options?: FileProcessingOptions,
  ): sharp.Sharp {
    return sharpInstance.webp({
      quality: options?.quality || 85,
      effort: 6, // Higher effort = better compression (0-6 scale)
    });
  }

  /**
   * Check if mime type is JPEG format
   */
  private static isJpegFormat(mimeType: string): boolean {
    return mimeType.startsWith('image/jpeg') || mimeType === 'image/jpg';
  }

  /**
   * Check if mime type is PNG format
   */
  private static isPngFormat(mimeType: string): boolean {
    return mimeType === 'image/png';
  }

  /**
   * Check if mime type is WebP format
   */
  private static isWebpFormat(mimeType: string): boolean {
    return mimeType === 'image/webp';
  }

  /**
   * Calculate compression ratio as percentage
   */
  private static calculateCompressionRatio(
    originalSize: number,
    compressedSize: number,
  ): number {
    if (originalSize === 0) return 0;
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  }

  /**
   * Log compression results
   */
  private static logCompressionResults(
    filename: string,
    originalSize: number,
    compressedSize: number,
    compressionRatio: number,
  ): void {
    this.logger.log(
      `Image compressed: ${filename} - Original: ${originalSize} bytes, ` +
        `Compressed: ${compressedSize} bytes (${compressionRatio}% reduction)`,
    );
  }
}
