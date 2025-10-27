export interface UploadConfigOptions {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  destination: string;
  generateUniqueName: boolean;
  preserveOriginalName: boolean;
}

export const IMAGE_UPLOAD_CONFIG: UploadConfigOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
  ],
  allowedExtensions: [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.bmp',
    '.tiff',
  ],
  destination: 'images',
  generateUniqueName: true,
  preserveOriginalName: true,
};

export const AUDIO_UPLOAD_CONFIG: UploadConfigOptions = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    'audio/mpeg',
    'audio/wav',
    'audio/flac',
    'audio/ogg',
    'audio/aac',
    'audio/mp4',
  ],
  allowedExtensions: ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a'],
  destination: 'audio',
  generateUniqueName: true,
  preserveOriginalName: true,
};

export const VIDEO_UPLOAD_CONFIG: UploadConfigOptions = {
  maxFileSize: 500 * 1024 * 1024, // 500MB
  allowedMimeTypes: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ],
  allowedExtensions: ['.mp4', '.mpeg', '.mov', '.avi', '.webm'],
  destination: 'video',
  generateUniqueName: true,
  preserveOriginalName: true,
};

export const DOWNLOAD_UPLOAD_CONFIG: UploadConfigOptions = {
  maxFileSize: 1024 * 1024 * 1024, // 1GB
  allowedMimeTypes: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/pdf',
    'application/octet-stream',
  ],
  allowedExtensions: ['.zip', '.rar', '.pdf', '.bin'],
  destination: 'downloads',
  generateUniqueName: true,
  preserveOriginalName: true,
};
