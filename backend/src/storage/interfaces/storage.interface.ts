export interface FileMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  filesize: number;
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  framerate?: number;
}

export interface StorageConfig {
  bucketName: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export interface UploadResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  filesize: number;
  bucketName: string;
  key: string;
  url: string;
  metadata?: Partial<FileMetadata>;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export enum FileType {
  IMAGE = 'image',
  AUDIO = 'audio',
  DOWNLOAD = 'download',
}

export interface FileValidationOptions {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export interface FileProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  compress?: boolean;
  generateThumbnail?: boolean;
}
