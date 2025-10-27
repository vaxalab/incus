import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { FileTypeResult, fileTypeFromBuffer } from 'file-type';
import type { UploadConfigOptions } from '../interfaces/upload-config.interface';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly config: UploadConfigOptions) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transform(file: Express.Multer.File, _metadata: ArgumentMetadata) {
    console.log('FileValidationPipe - Received file:', {
      fieldname: file?.fieldname,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      buffer: file?.buffer ? 'Buffer present' : 'No buffer',
    });

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check if buffer exists
    if (!file.buffer) {
      throw new BadRequestException('File buffer is empty');
    }

    // Validate file size
    if (file.size > this.config.maxFileSize) {
      throw new BadRequestException(
        `File size ${file.size} exceeds maximum allowed size of ${this.config.maxFileSize} bytes`,
      );
    }

    // Validate file extension (only if originalname exists)
    if (file.originalname) {
      const fileExtension = this.getFileExtension(file.originalname);
      if (
        !this.config.allowedExtensions.includes(fileExtension.toLowerCase())
      ) {
        throw new BadRequestException(
          `File extension ${fileExtension} is not allowed. Allowed extensions: ${this.config.allowedExtensions.join(', ')}`,
        );
      }
    }

    // Validate MIME type from buffer (more secure than trusting the client)
    const fileTypeResult: FileTypeResult | undefined = await fileTypeFromBuffer(
      file.buffer,
    );

    if (!fileTypeResult) {
      throw new BadRequestException('Unable to determine file type');
    }

    if (!this.config.allowedMimeTypes.includes(fileTypeResult.mime)) {
      throw new BadRequestException(
        `File type ${fileTypeResult.mime} is not allowed. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`,
      );
    }

    // Update the file object with the verified MIME type
    file.mimetype = fileTypeResult.mime;

    // Basic security checks
    await this.performSecurityChecks(file);

    console.log('FileValidationPipe - Validation passed successfully');
    return file;
  }

  private getFileExtension(filename: string | undefined): string {
    // Safely handle undefined/null filename
    if (!filename || typeof filename !== 'string') {
      return '';
    }

    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
  }

  private async performSecurityChecks(
    file: Express.Multer.File,
  ): Promise<void> {
    // Check for suspicious file signatures
    const suspiciousSignatures = [
      // Executable signatures
      Buffer.from([0x4d, 0x5a]), // MZ (PE executable)
      Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF
      Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // Java class file
      Buffer.from([0xfe, 0xed, 0xfa, 0xce]), // Mach-O
    ];

    for (const signature of suspiciousSignatures) {
      if (file.buffer.subarray(0, signature.length).equals(signature)) {
        throw new BadRequestException('File contains suspicious content');
      }
    }

    // Check for script content in file names (only if originalname exists)
    if (file.originalname) {
      const suspiciousPatterns = [
        /\.php$/i,
        /\.jsp$/i,
        /\.asp$/i,
        /\.js$/i,
        /\.html$/i,
        /\.htm$/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(file.originalname)) {
          throw new BadRequestException(
            'File name contains suspicious patterns',
          );
        }
      }
    }

    // For images, additional checks could be added here
    if (file.mimetype.startsWith('image/')) {
      await this.validateImageFile(file);
    }
  }

  private async validateImageFile(file: Express.Multer.File): Promise<void> {
    // Additional image-specific validations
    // Only check the first 1024 bytes for suspicious content (where metadata usually resides)
    // This avoids false positives from binary image data
    const headerBytes = file.buffer.subarray(0, 1024);
    const headerContent = headerBytes.toString(
      'utf8',
      0,
      Math.min(512, headerBytes.length),
    );

    // Look for script tags, PHP tags, etc. only in the header
    const scriptPatterns = [
      /<script[\s>]/i,
      /<\?php/i,
      /<%[\s\S]/i,
      /javascript:/i,
      /vbscript:/i,
      /<html/i,
      /<body/i,
    ];

    // Only flag if we find clear script indicators in the header
    for (const pattern of scriptPatterns) {
      if (pattern.test(headerContent)) {
        console.log('Suspicious content detected in image header:', {
          pattern: pattern.toString(),
          headerContent: headerContent.substring(0, 100),
        });
        throw new BadRequestException(
          'Image file contains suspicious script content',
        );
      }
    }

    console.log('Image validation passed - no suspicious content detected');
  }
}
