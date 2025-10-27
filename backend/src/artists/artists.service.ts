import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ArtistsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    createArtistDto: CreateArtistDto,
    addedById: string,
    images?: Express.Multer.File[],
    bannerImage?: Express.Multer.File,
  ) {
    // Check if artist with same name or slug already exists
    const existingArtist = await this.databaseService.artist.findFirst({
      where: {
        OR: [{ name: createArtistDto.name }, { slug: createArtistDto.slug }],
      },
    });

    if (existingArtist) {
      throw new ConflictException(
        'Artist with this name or slug already exists',
      );
    }

    // Start transaction for artist creation
    return await this.databaseService.$transaction(async (tx) => {
      // Create artist first
      const artist = await tx.artist.create({
        data: {
          name: createArtistDto.name,
          slug: createArtistDto.slug,
          bio: createArtistDto.bio,
          website: createArtistDto.website,
          instagram: createArtistDto.instagram,
          twitter: createArtistDto.twitter,
          spotify: createArtistDto.spotify,
          appleMusicUrl: createArtistDto.appleMusicUrl,
          youtubeUrl: createArtistDto.youtubeUrl,
          youtubeMusicUrl: createArtistDto.youtubeMusicUrl,
          soundcloud: createArtistDto.soundcloud,
          addedById,
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
          'artists',
        );
        bannerImageId = uploadedBannerImage.id;
      }

      // Handle multiple images upload
      const uploadedImages: string[] = [];
      if (images && images.length > 0) {
        // Upload all images in parallel
        const imageUploadPromises = images.map(async (image, index) => {
          const order =
            createArtistDto.imageOrders?.find((_, idx) => idx === index)
              ?.order || index;

          const uploadedImage = await this.storageService.uploadImage(
            image,
            {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 85,
            },
            'artists',
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

      // Update artist with banner image and connect images
      const updatedArtist = await tx.artist.update({
        where: { id: artist.id },
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
          addedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return updatedArtist;
    });
  }

  async findAll(page = 1, limit = 20, includeInactive = false) {
    const skip = (page - 1) * limit;

    const where = includeInactive ? {} : { isActive: true };

    const [artists, total] = await Promise.all([
      this.databaseService.artist.findMany({
        where,
        skip,
        take: limit,
        include: {
          bannerImage: true,
          images: {
            orderBy: { order: 'asc' },
            take: 1, // Just the first image for listing
          },
          _count: {
            select: {
              releases: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.databaseService.artist.count({ where }),
    ]);

    return {
      artists,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const artist = await this.databaseService.artist.findUnique({
      where: { id },
      include: {
        bannerImage: true,
        images: {
          orderBy: { order: 'asc' },
        },
        releases: {
          include: {
            images: {
              take: 1,
            },
          },
          orderBy: { releaseDate: 'desc' },
        },
        addedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    return artist;
  }

  async findBySlug(slug: string) {
    const artist = await this.databaseService.artist.findUnique({
      where: { slug, isActive: true },
      include: {
        bannerImage: true,
        images: {
          orderBy: { order: 'asc' },
        },
        releases: {
          where: { isActive: true },
          include: {
            images: {
              take: 1,
            },
          },
          orderBy: { releaseDate: 'desc' },
        },
      },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    return artist;
  }

  async update(
    id: string,
    updateArtistDto: UpdateArtistDto,
    images?: Express.Multer.File[],
    bannerImage?: Express.Multer.File,
  ) {
    const existingArtist = await this.databaseService.artist.findUnique({
      where: { id },
      include: {
        bannerImage: true,
        images: true,
      },
    });

    if (!existingArtist) {
      throw new NotFoundException('Artist not found');
    }

    // Check for conflicts if updating name or slug
    if (updateArtistDto.name || updateArtistDto.slug) {
      const conflictingArtist = await this.databaseService.artist.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateArtistDto.name ? { name: updateArtistDto.name } : {},
                updateArtistDto.slug ? { slug: updateArtistDto.slug } : {},
              ].filter((condition) => Object.keys(condition).length > 0),
            },
          ],
        },
      });

      if (conflictingArtist) {
        throw new ConflictException(
          'Artist with this name or slug already exists',
        );
      }
    }

    return await this.databaseService.$transaction(async (tx) => {
      // Handle banner image update
      let bannerImageId = existingArtist.bannerImageId;
      if (bannerImage) {
        // Delete old banner image if exists
        if (existingArtist.bannerImage) {
          await this.storageService.deleteFile(
            existingArtist.bannerImage.bucketName,
            existingArtist.bannerImage.key,
          );
          await tx.image.delete({
            where: { id: existingArtist.bannerImage.id },
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
          'artists',
        );
        bannerImageId = uploadedBannerImage.id;
      }

      // Handle additional images
      const newImageIds: string[] = [];
      if (images && images.length > 0) {
        // Upload all images in parallel
        const imageUploadPromises = images.map(async (image, index) => {
          const order =
            updateArtistDto.imageOrders?.find((_, idx) => idx === index)
              ?.order || existingArtist.images.length + index;

          const uploadedImage = await this.storageService.uploadImage(
            image,
            {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 85,
            },
            'artists',
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

      // Update artist
      const updatedArtist = await tx.artist.update({
        where: { id },
        data: {
          ...updateArtistDto,
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
          addedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return updatedArtist;
    });
  }

  async updateImageOrder(
    id: string,
    imageOrders: { imageId: string; order: number }[],
  ) {
    const artist = await this.databaseService.artist.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    // Validate that all imageIds belong to this artist
    const artistImageIds = artist.images.map((img) => img.id);
    const invalidImageIds = imageOrders.filter(
      (order) => !artistImageIds.includes(order.imageId),
    );

    if (invalidImageIds.length > 0) {
      throw new BadRequestException('Some images do not belong to this artist');
    }

    // Validate that orders are unique and within valid range
    const orders = imageOrders.map((io) => io.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new BadRequestException('Image orders must be unique');
    }

    const minOrder = Math.min(...orders);
    const maxOrder = Math.max(...orders);
    if (minOrder < 0 || maxOrder >= artist.images.length) {
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
    const artist = await this.databaseService.artist.findUnique({
      where: { id },
      include: { images: { orderBy: { order: 'asc' } } },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    const imageIndex = artist.images.findIndex((img) => img.id === imageId);
    if (imageIndex === -1) {
      throw new NotFoundException('Image not found for this artist');
    }

    if (newOrder < 0 || newOrder >= artist.images.length) {
      throw new BadRequestException('Invalid order position');
    }

    const currentOrder = artist.images[imageIndex].order;

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
              in: artist.images
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
              in: artist.images
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

  async removeImage(artistId: string, imageId: string) {
    const artist = await this.databaseService.artist.findUnique({
      where: { id: artistId },
      include: { images: true },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    const image = artist.images.find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundException('Image not found for this artist');
    }

    // Remove image from storage and database
    await this.storageService.deleteFile(image.bucketName, image.key);

    await this.databaseService.artist.update({
      where: { id: artistId },
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
    const artist = await this.databaseService.artist.update({
      where: { id },
      data: { isActive: false },
      include: {
        bannerImage: true,
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return artist;
  }

  async activate(id: string) {
    const artist = await this.databaseService.artist.update({
      where: { id },
      data: { isActive: true },
      include: {
        bannerImage: true,
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return artist;
  }

  async remove(id: string) {
    const artist = await this.databaseService.artist.findUnique({
      where: { id },
      include: {
        bannerImage: true,
        images: true,
        releases: true,
      },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    // Check if artist has releases
    if (artist.releases.length > 0) {
      throw new ConflictException(
        'Cannot delete artist with existing releases. Deactivate instead.',
      );
    }

    return await this.databaseService.$transaction(async (tx) => {
      // Delete banner image from storage and database
      if (artist.bannerImage) {
        await this.storageService.deleteFile(
          artist.bannerImage.bucketName,
          artist.bannerImage.key,
        );
        await tx.image.delete({
          where: { id: artist.bannerImage.id },
        });
      }

      // Delete all images from storage and database
      for (const image of artist.images) {
        await this.storageService.deleteFile(image.bucketName, image.key);
        await tx.image.delete({
          where: { id: image.id },
        });
      }

      // Delete artist
      await tx.artist.delete({
        where: { id },
      });

      return { message: 'Artist deleted successfully' };
    });
  }
}
