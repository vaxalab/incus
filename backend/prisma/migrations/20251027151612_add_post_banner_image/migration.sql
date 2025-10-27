/*
  Warnings:

  - A unique constraint covering the columns `[bannerImageId]` on the table `posts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "bannerImageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "posts_bannerImageId_key" ON "posts"("bannerImageId");

-- CreateIndex
CREATE INDEX "posts_bannerImageId_idx" ON "posts"("bannerImageId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_bannerImageId_fkey" FOREIGN KEY ("bannerImageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
