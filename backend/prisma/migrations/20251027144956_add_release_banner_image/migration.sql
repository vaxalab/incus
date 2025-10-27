/*
  Warnings:

  - A unique constraint covering the columns `[bannerImageId]` on the table `releases` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "releases" ADD COLUMN     "bannerImageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "releases_bannerImageId_key" ON "releases"("bannerImageId");

-- CreateIndex
CREATE INDEX "releases_bannerImageId_idx" ON "releases"("bannerImageId");

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_bannerImageId_fkey" FOREIGN KEY ("bannerImageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
