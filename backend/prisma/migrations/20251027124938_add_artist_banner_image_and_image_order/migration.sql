/*
  Warnings:

  - A unique constraint covering the columns `[bannerImageId]` on the table `artists` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "bannerImageId" TEXT;

-- AlterTable
ALTER TABLE "images" ADD COLUMN     "order" INTEGER DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "artists_bannerImageId_key" ON "artists"("bannerImageId");

-- CreateIndex
CREATE INDEX "artists_bannerImageId_idx" ON "artists"("bannerImageId");

-- CreateIndex
CREATE INDEX "images_order_idx" ON "images"("order");

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_bannerImageId_fkey" FOREIGN KEY ("bannerImageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
