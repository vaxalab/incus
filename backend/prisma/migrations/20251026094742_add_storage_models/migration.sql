/*
  Warnings:

  - Added the required column `bucketName` to the `images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key` to the `images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `images` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "digital_downloads" ADD COLUMN     "downloadFileId" TEXT;

-- AlterTable
ALTER TABLE "images" ADD COLUMN     "bucketName" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "audioFileId" TEXT;

-- CreateTable
CREATE TABLE "audio_files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filesize" INTEGER NOT NULL,
    "duration" INTEGER,
    "bitrate" INTEGER,
    "sampleRate" INTEGER,
    "channels" INTEGER,
    "bucketName" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filesize" INTEGER NOT NULL,
    "duration" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "framerate" DOUBLE PRECISION,
    "bitrate" INTEGER,
    "bucketName" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filesize" INTEGER NOT NULL,
    "bucketName" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "download_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audio_files_id_idx" ON "audio_files"("id");

-- CreateIndex
CREATE INDEX "audio_files_filename_idx" ON "audio_files"("filename");

-- CreateIndex
CREATE INDEX "audio_files_mimeType_idx" ON "audio_files"("mimeType");

-- CreateIndex
CREATE INDEX "audio_files_bucketName_idx" ON "audio_files"("bucketName");

-- CreateIndex
CREATE INDEX "audio_files_key_idx" ON "audio_files"("key");

-- CreateIndex
CREATE INDEX "audio_files_isPublic_idx" ON "audio_files"("isPublic");

-- CreateIndex
CREATE INDEX "audio_files_createdAt_idx" ON "audio_files"("createdAt");

-- CreateIndex
CREATE INDEX "video_files_id_idx" ON "video_files"("id");

-- CreateIndex
CREATE INDEX "video_files_filename_idx" ON "video_files"("filename");

-- CreateIndex
CREATE INDEX "video_files_mimeType_idx" ON "video_files"("mimeType");

-- CreateIndex
CREATE INDEX "video_files_bucketName_idx" ON "video_files"("bucketName");

-- CreateIndex
CREATE INDEX "video_files_key_idx" ON "video_files"("key");

-- CreateIndex
CREATE INDEX "video_files_isPublic_idx" ON "video_files"("isPublic");

-- CreateIndex
CREATE INDEX "video_files_createdAt_idx" ON "video_files"("createdAt");

-- CreateIndex
CREATE INDEX "download_files_id_idx" ON "download_files"("id");

-- CreateIndex
CREATE INDEX "download_files_filename_idx" ON "download_files"("filename");

-- CreateIndex
CREATE INDEX "download_files_mimeType_idx" ON "download_files"("mimeType");

-- CreateIndex
CREATE INDEX "download_files_bucketName_idx" ON "download_files"("bucketName");

-- CreateIndex
CREATE INDEX "download_files_key_idx" ON "download_files"("key");

-- CreateIndex
CREATE INDEX "download_files_createdAt_idx" ON "download_files"("createdAt");

-- CreateIndex
CREATE INDEX "digital_downloads_downloadFileId_idx" ON "digital_downloads"("downloadFileId");

-- CreateIndex
CREATE INDEX "images_bucketName_idx" ON "images"("bucketName");

-- CreateIndex
CREATE INDEX "images_key_idx" ON "images"("key");

-- CreateIndex
CREATE INDEX "tracks_audioFileId_idx" ON "tracks"("audioFileId");

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "audio_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_downloads" ADD CONSTRAINT "digital_downloads_downloadFileId_fkey" FOREIGN KEY ("downloadFileId") REFERENCES "download_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
