import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';

@Injectable()
export class ReleasesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    createReleaseDto: CreateReleaseDto,
    addedById: string,
    images?: Express.Multer.File[],
    bannerImage?: Express.Multer.File,
  ) {
    // Check if release with same slug already exists
    const existingRelease = await this.databaseService.release.findFirst({
      where: { slug: createReleaseDto.slug },
    });

    if (existingRelease) {
      throw new ConflictException('Release with this slug already exists');
    }

    // Check if artist exists
    const artist = await this.databaseService.artist.findUnique({
      where: { id: createReleaseDto.artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    // Start transaction for release creation
    return await this.databaseService.$transaction(async (tx) => {
      // Create release first
      const release = await tx.release.create({
        data: {
          title: createReleaseDto.title,
          slug: createReleaseDto.slug,
          displayArtist: createReleaseDto.displayArtist,
          releaseDate: createReleaseDto.releaseDate,
          type: createReleaseDto.type,
          description: createReleaseDto.description,
          spotifyUrl: createReleaseDto.spotifyUrl,
          addToPlaylistUrl: createReleaseDto.addToPlaylistUrl,
          appleMusicUrl: createReleaseDto.appleMusicUrl,
          youtubeUrl: createReleaseDto.youtubeUrl,
          youtubeMusicUrl: createReleaseDto.youtubeMusicUrl,
          soundcloudUrl: createReleaseDto.soundcloudUrl,
          artistId: createReleaseDto.artistId,
        },
      });

      // Handle banner image upload
      let bannerImageId: string | undefined;
      if (bannerImage) {
        const uploadedBannerImage = await this.storageService.uploadImage(
          bannerImage,
          {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 90,
          },
          'releases',
        );
        bannerImageId = uploadedBannerImage.id;
      }

      // Handle multiple images upload
      const uploadedImages: string[] = [];
      if (images && images.length > 0) {
        // Upload all images in parallel
        const imageUploadPromises = images.map(async (image, index) => {
          const order =
            createReleaseDto.imageOrders?.find((_, idx) => idx === index)
              ?.order || index;

          const uploadedImage = await this.storageService.uploadImage(
            image,
            {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 85,
            },
            'releases',
          );

          return { id: uploadedImage.id, order };
        });

        const uploadResults = await Promise.all(imageUploadPromises);

        // Update image orders in parallel and collect IDs
        const orderUpdatePromises = uploadResults.map(({ id, order }) =>
          tx.image.update({
            where: { id },
            data: { order },
          }),
        );

        await Promise.all(orderUpdatePromises);
        uploadedImages.push(...uploadResults.map((result) => result.id));
      }

      // Update release with banner image and connect images
      const updatedRelease = await tx.release.update({
        where: { id: release.id },
        data: {
          bannerImageId,
          images: {
            connect: uploadedImages.map((id) => ({ id })),
          },
        },
        include: {
          bannerImage: true,
          images: {
            orderBy: { order: 'asc' },
          },
          artist: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return updatedRelease;
    });
  }

  async findAll(page = 1, limit = 20, includeInactive = false) {
    const skip = (page - 1) * limit;

    const where = includeInactive ? {} : { isActive: true };

    const [releases, total] = await Promise.all([
      this.databaseService.release.findMany({
        where,
        skip,
        take: limit,
        include: {
          bannerImage: true,
          images: {
            orderBy: { order: 'asc' },
            take: 1, // Just the first image for listing
          },
          artist: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              tracks: true,
            },
          },
        },
        orderBy: { releaseDate: 'desc' },
      }),
      this.databaseService.release.count({ where }),
    ]);

    return {
      releases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const release = await this.databaseService.release.findUnique({
      where: { id },
      include: {
        bannerImage: true,
        images: {
          orderBy: { order: 'asc' },
        },
        artist: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tracks: {
          include: {
            audioFile: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                mimeType: true,
                filesize: true,
                duration: true,
                url: true,
              },
            },
          },
          orderBy: { trackNumber: 'asc' },
        },
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            type: true,
          },
        },
      },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    return release;
  }

  async findBySlug(slug: string) {
    const release = await this.databaseService.release.findUnique({
      where: { slug, isActive: true },
      include: {
        bannerImage: true,
        images: {
          orderBy: { order: 'asc' },
        },
        artist: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tracks: {
          where: { playable: true },
          include: {
            audioFile: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                mimeType: true,
                filesize: true,
                duration: true,
                url: true,
              },
            },
          },
          orderBy: { trackNumber: 'asc' },
        },
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            type: true,
          },
        },
      },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    return release;
  }

  async update(
    id: string,
    updateReleaseDto: UpdateReleaseDto,
    images?: Express.Multer.File[],
    bannerImage?: Express.Multer.File,
  ) {
    const existingRelease = await this.databaseService.release.findUnique({
      where: { id },
      include: {
        bannerImage: true,
        images: true,
      },
    });

    if (!existingRelease) {
      throw new NotFoundException('Release not found');
    }

    // Check for conflicts if updating slug
    if (updateReleaseDto.slug) {
      const conflictingRelease = await this.databaseService.release.findFirst({
        where: {
          AND: [{ id: { not: id } }, { slug: updateReleaseDto.slug }],
        },
      });

      if (conflictingRelease) {
        throw new ConflictException('Release with this slug already exists');
      }
    }

    // Check if artist exists if updating artistId
    if (updateReleaseDto.artistId) {
      const artist = await this.databaseService.artist.findUnique({
        where: { id: updateReleaseDto.artistId },
      });

      if (!artist) {
        throw new NotFoundException('Artist not found');
      }
    }

    return await this.databaseService.$transaction(async (tx) => {
      // Handle banner image update
      let bannerImageId = existingRelease.bannerImageId;
      if (bannerImage) {
        // Delete old banner image if exists
        if (existingRelease.bannerImage) {
          await this.storageService.deleteFile(
            existingRelease.bannerImage.bucketName,
            existingRelease.bannerImage.key,
          );
          await tx.image.delete({
            where: { id: existingRelease.bannerImage.id },
          });
        }

        // Upload new banner image
        const uploadedBannerImage = await this.storageService.uploadImage(
          bannerImage,
          {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 90,
          },
          'releases',
        );
        bannerImageId = uploadedBannerImage.id;
      }

      // Handle additional images
      const newImageIds: string[] = [];
      if (images && images.length > 0) {
        // Upload all images in parallel
        const imageUploadPromises = images.map(async (image, index) => {
          const order =
            updateReleaseDto.imageOrders?.find((_, idx) => idx === index)
              ?.order || existingRelease.images.length + index;

          const uploadedImage = await this.storageService.uploadImage(
            image,
            {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 85,
            },
            'releases',
          );

          return { id: uploadedImage.id, order };
        });

        const uploadResults = await Promise.all(imageUploadPromises);

        // Update image orders in parallel and collect IDs
        const orderUpdatePromises = uploadResults.map(({ id, order }) =>
          tx.image.update({
            where: { id },
            data: { order },
          }),
        );

        await Promise.all(orderUpdatePromises);
        newImageIds.push(...uploadResults.map((result) => result.id));
      }

      // Update release
      const updatedRelease = await tx.release.update({
        where: { id },
        data: {
          ...updateReleaseDto,
          bannerImageId,
          images:
            newImageIds.length > 0
              ? {
                  connect: newImageIds.map((imageId) => ({ id: imageId })),
                }
              : undefined,
        },
        include: {
          bannerImage: true,
          images: {
            orderBy: { order: 'asc' },
          },
          artist: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return updatedRelease;
    });
  }

  async updateImageOrder(
    id: string,
    imageOrders: { imageId: string; order: number }[],
  ) {
    const release = await this.databaseService.release.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    // Validate that all imageIds belong to this release
    const releaseImageIds = release.images.map((img) => img.id);
    const invalidImageIds = imageOrders.filter(
      (order) => !releaseImageIds.includes(order.imageId),
    );

    if (invalidImageIds.length > 0) {
      throw new BadRequestException(
        'Some images do not belong to this release',
      );
    }

    // Validate that orders are unique and within valid range
    const orders = imageOrders.map((io) => io.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new BadRequestException('Image orders must be unique');
    }

    const minOrder = Math.min(...orders);
    const maxOrder = Math.max(...orders);
    if (minOrder < 0 || maxOrder >= release.images.length) {
      throw new BadRequestException(
        'Image orders must be sequential starting from 0',
      );
    }

    // Update image orders in parallel
    await Promise.all(
      imageOrders.map(({ imageId, order }) =>
        this.databaseService.image.update({
          where: { id: imageId },
          data: { order },
        }),
      ),
    );

    return this.findOne(id);
  }

  async reorderSingleImage(id: string, imageId: string, newOrder: number) {
    const release = await this.databaseService.release.findUnique({
      where: { id },
      include: { images: { orderBy: { order: 'asc' } } },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    const imageIndex = release.images.findIndex((img) => img.id === imageId);
    if (imageIndex === -1) {
      throw new NotFoundException('Image not found for this release');
    }

    if (newOrder < 0 || newOrder >= release.images.length) {
      throw new BadRequestException('Invalid order position');
    }

    const currentOrder = release.images[imageIndex].order;

    // If order hasn't changed, return early
    if (currentOrder === newOrder) {
      return this.findOne(id);
    }

    // Use transaction to ensure atomicity
    return await this.databaseService.$transaction(async (tx) => {
      if (newOrder > currentOrder) {
        // Moving image down: shift images between current and new position up
        await tx.image.updateMany({
          where: {
            id: {
              in: release.images
                .slice(currentOrder + 1, newOrder + 1)
                .map((img) => img.id),
            },
          },
          data: {
            order: {
              decrement: 1,
            },
          },
        });
      } else {
        // Moving image up: shift images between new and current position down
        await tx.image.updateMany({
          where: {
            id: {
              in: release.images
                .slice(newOrder, currentOrder)
                .map((img) => img.id),
            },
          },
          data: {
            order: {
              increment: 1,
            },
          },
        });
      }

      // Update the moved image's order
      await tx.image.update({
        where: { id: imageId },
        data: { order: newOrder },
      });

      return this.findOne(id);
    });
  }

  async removeImage(releaseId: string, imageId: string) {
    const release = await this.databaseService.release.findUnique({
      where: { id: releaseId },
      include: { images: true },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    const image = release.images.find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundException('Image not found for this release');
    }

    // Remove image from storage and database
    await this.storageService.deleteFile(image.bucketName, image.key);

    await this.databaseService.release.update({
      where: { id: releaseId },
      data: {
        images: {
          disconnect: { id: imageId },
        },
      },
    });

    await this.databaseService.image.delete({
      where: { id: imageId },
    });

    return { message: 'Image removed successfully' };
  }

  async deactivate(id: string) {
    const release = await this.databaseService.release.update({
      where: { id },
      data: { isActive: false },
      include: {
        bannerImage: true,
        images: {
          orderBy: { order: 'asc' },
        },
        artist: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return release;
  }

  async activate(id: string) {
    const release = await this.databaseService.release.update({
      where: { id },
      data: { isActive: true },
      include: {
        bannerImage: true,
        images: {
          orderBy: { order: 'asc' },
        },
        artist: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return release;
  }

  async remove(id: string) {
    const release = await this.databaseService.release.findUnique({
      where: { id },
      include: {
        bannerImage: true,
        images: true,
        tracks: true,
        products: true,
      },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    // Check if release has products
    if (release.products.length > 0) {
      throw new ConflictException(
        'Cannot delete release with existing products. Deactivate instead.',
      );
    }

    return await this.databaseService.$transaction(async (tx) => {
      // Delete banner image from storage and database
      if (release.bannerImage) {
        await this.storageService.deleteFile(
          release.bannerImage.bucketName,
          release.bannerImage.key,
        );
        await tx.image.delete({
          where: { id: release.bannerImage.id },
        });
      }

      // Delete all images from storage and database
      for (const image of release.images) {
        await this.storageService.deleteFile(image.bucketName, image.key);
        await tx.image.delete({
          where: { id: image.id },
        });
      }

      // Delete tracks (this will cascade to audio files if configured)
      for (const track of release.tracks) {
        await tx.track.delete({
          where: { id: track.id },
        });
      }

      // Delete release
      await tx.release.delete({
        where: { id },
      });

      return { message: 'Release deleted successfully' };
    });
  }
}
