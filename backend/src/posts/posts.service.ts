import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    createPostDto: CreatePostDto,
    authorId: string,
    images?: Express.Multer.File[],
    bannerImage?: Express.Multer.File,
  ) {
    // Check if post with same slug already exists
    const existingPost = await this.databaseService.post.findUnique({
      where: { slug: createPostDto.slug },
    });

    if (existingPost) {
      throw new ConflictException('Post with this slug already exists');
    }

    return await this.databaseService.$transaction(async (tx) => {
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
          'posts',
        );
        bannerImageId = uploadedBannerImage.id;
      }

      // Handle multiple images upload
      const uploadedImages: string[] = [];
      if (images && images.length > 0) {
        const imageUploadPromises = images.map(async (image, index) => {
          const order =
            createPostDto.imageOrders?.find((_, idx) => idx === index)?.order ||
            index;

          const uploadedImage = await this.storageService.uploadImage(
            image,
            {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 85,
            },
            'posts',
          );

          return { id: uploadedImage.id, order };
        });

        const uploadResults = await Promise.all(imageUploadPromises);

        const orderUpdatePromises = uploadResults.map(({ id, order }) =>
          tx.image.update({
            where: { id },
            data: { order },
          }),
        );

        await Promise.all(orderUpdatePromises);
        uploadedImages.push(...uploadResults.map((result) => result.id));
      }

      // Create post
      const post = await tx.post.create({
        data: {
          title: createPostDto.title,
          slug: createPostDto.slug,
          excerpt: createPostDto.excerpt,
          content: createPostDto.content,
          isPublished: createPostDto.isPublished ?? false,
          isFeatured: createPostDto.isFeatured ?? false,
          publishedAt: createPostDto.publishedAt
            ? new Date(createPostDto.publishedAt)
            : null,
          bannerImageId,
          authorId,
          tags: createPostDto.tagIds
            ? {
                create: createPostDto.tagIds.map((tagId) => ({
                  tagId,
                })),
              }
            : undefined,
          images:
            uploadedImages.length > 0
              ? { connect: uploadedImages.map((id) => ({ id })) }
              : undefined,
        },
        include: {
          bannerImage: true,
          images: { orderBy: { order: 'asc' } },
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          tags: { include: { tag: true } },
        },
      });

      return post;
    });
  }

  async findAll(page = 1, limit = 20, includeUnpublished = false) {
    const skip = (page - 1) * limit;

    const where = includeUnpublished ? {} : { isPublished: true };

    const [posts, total] = await Promise.all([
      this.databaseService.post.findMany({
        where,
        skip,
        take: limit,
        include: {
          bannerImage: true,
          images: { take: 1, orderBy: { order: 'asc' } },
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          tags: { include: { tag: true } },
          _count: { select: { images: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.databaseService.post.count({ where }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const post = await this.databaseService.post.findUnique({
      where: { id },
      include: {
        bannerImage: true,
        images: { orderBy: { order: 'asc' } },
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        tags: { include: { tag: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async findBySlug(slug: string) {
    const post = await this.databaseService.post.findUnique({
      where: { slug, isPublished: true },
      include: {
        bannerImage: true,
        images: { orderBy: { order: 'asc' } },
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        tags: { include: { tag: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async getTags() {
    return this.databaseService.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createTag(createTagDto: {
    name: string;
    slug: string;
    color?: string;
  }) {
    // Check if tag with same name or slug already exists
    const existingTag = await this.databaseService.tag.findFirst({
      where: {
        OR: [{ name: createTagDto.name }, { slug: createTagDto.slug }],
      },
    });

    if (existingTag) {
      throw new ConflictException(
        existingTag.name === createTagDto.name
          ? 'Tag with this name already exists'
          : 'Tag with this slug already exists',
      );
    }

    return this.databaseService.tag.create({
      data: createTagDto,
    });
  }

  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    images?: Express.Multer.File[],
    bannerImage?: Express.Multer.File,
  ) {
    const existingPost = await this.databaseService.post.findUnique({
      where: { id },
      include: { bannerImage: true, images: true, tags: true },
    });

    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    // Check for slug conflicts
    if (updatePostDto.slug && updatePostDto.slug !== existingPost.slug) {
      const conflictingPost = await this.databaseService.post.findUnique({
        where: { slug: updatePostDto.slug },
      });

      if (conflictingPost) {
        throw new ConflictException('Post with this slug already exists');
      }
    }

    return await this.databaseService.$transaction(async (tx) => {
      // Handle banner image update
      let bannerImageId = existingPost.bannerImageId;
      if (bannerImage) {
        if (existingPost.bannerImage) {
          await this.storageService.deleteFile(
            existingPost.bannerImage.bucketName,
            existingPost.bannerImage.key,
          );
          await tx.image.delete({ where: { id: existingPost.bannerImage.id } });
        }

        const uploadedBannerImage = await this.storageService.uploadImage(
          bannerImage,
          { maxWidth: 1920, maxHeight: 1080, quality: 90 },
          'posts',
        );
        bannerImageId = uploadedBannerImage.id;
      }

      // Handle additional images
      const newImageIds: string[] = [];
      if (images && images.length > 0) {
        const imageUploadPromises = images.map(async (image, index) => {
          const order =
            updatePostDto.imageOrders?.find((_, idx) => idx === index)?.order ||
            existingPost.images.length + index;

          const uploadedImage = await this.storageService.uploadImage(
            image,
            { maxWidth: 1200, maxHeight: 1200, quality: 85 },
            'posts',
          );

          return { id: uploadedImage.id, order };
        });

        const uploadResults = await Promise.all(imageUploadPromises);

        const orderUpdatePromises = uploadResults.map(({ id, order }) =>
          tx.image.update({ where: { id }, data: { order } }),
        );

        await Promise.all(orderUpdatePromises);
        newImageIds.push(...uploadResults.map((result) => result.id));
      }

      // Update post
      const updatedPost = await tx.post.update({
        where: { id },
        data: {
          ...updatePostDto,
          publishedAt: updatePostDto.publishedAt
            ? new Date(updatePostDto.publishedAt)
            : undefined,
          bannerImageId,
          images:
            newImageIds.length > 0
              ? { connect: newImageIds.map((id) => ({ id })) }
              : undefined,
          tags: updatePostDto.tagIds
            ? {
                deleteMany: {},
                create: updatePostDto.tagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
        },
        include: {
          bannerImage: true,
          images: { orderBy: { order: 'asc' } },
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          tags: { include: { tag: true } },
        },
      });

      return updatedPost;
    });
  }

  async updateImageOrder(
    id: string,
    imageOrders: { imageId: string; order: number }[],
  ) {
    const post = await this.databaseService.post.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const postImageIds = post.images.map((img) => img.id);
    const invalidImageIds = imageOrders.filter(
      (order) => !postImageIds.includes(order.imageId),
    );

    if (invalidImageIds.length > 0) {
      throw new BadRequestException('Some images do not belong to this post');
    }

    const orders = imageOrders.map((io) => io.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new BadRequestException('Image orders must be unique');
    }

    const minOrder = Math.min(...orders);
    const maxOrder = Math.max(...orders);
    if (minOrder < 0 || maxOrder >= post.images.length) {
      throw new BadRequestException(
        'Image orders must be sequential starting from 0',
      );
    }

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
    const post = await this.databaseService.post.findUnique({
      where: { id },
      include: { images: { orderBy: { order: 'asc' } } },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const imageIndex = post.images.findIndex((img) => img.id === imageId);
    if (imageIndex === -1) {
      throw new NotFoundException('Image not found for this post');
    }

    if (newOrder < 0 || newOrder >= post.images.length) {
      throw new BadRequestException('Invalid order position');
    }

    const currentOrder = post.images[imageIndex].order;

    if (currentOrder === newOrder) {
      return this.findOne(id);
    }

    return await this.databaseService.$transaction(async (tx) => {
      if (newOrder > currentOrder) {
        await tx.image.updateMany({
          where: {
            id: {
              in: post.images
                .slice(currentOrder + 1, newOrder + 1)
                .map((img) => img.id),
            },
          },
          data: { order: { decrement: 1 } },
        });
      } else {
        await tx.image.updateMany({
          where: {
            id: {
              in: post.images
                .slice(newOrder, currentOrder)
                .map((img) => img.id),
            },
          },
          data: { order: { increment: 1 } },
        });
      }

      await tx.image.update({
        where: { id: imageId },
        data: { order: newOrder },
      });

      return this.findOne(id);
    });
  }

  async removeImage(postId: string, imageId: string) {
    const post = await this.databaseService.post.findUnique({
      where: { id: postId },
      include: { images: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const image = post.images.find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundException('Image not found for this post');
    }

    await this.storageService.deleteFile(image.bucketName, image.key);

    await this.databaseService.post.update({
      where: { id: postId },
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

  async publish(id: string) {
    const post = await this.databaseService.post.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
      include: {
        bannerImage: true,
        images: { orderBy: { order: 'asc' } },
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        tags: { include: { tag: true } },
      },
    });

    return post;
  }

  async unpublish(id: string) {
    const post = await this.databaseService.post.update({
      where: { id },
      data: {
        isPublished: false,
        publishedAt: null,
      },
      include: {
        bannerImage: true,
        images: { orderBy: { order: 'asc' } },
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        tags: { include: { tag: true } },
      },
    });

    return post;
  }

  async remove(id: string) {
    const post = await this.databaseService.post.findUnique({
      where: { id },
      include: {
        bannerImage: true,
        images: true,
        tags: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return await this.databaseService.$transaction(async (tx) => {
      // Delete banner image from storage and database
      if (post.bannerImage) {
        await this.storageService.deleteFile(
          post.bannerImage.bucketName,
          post.bannerImage.key,
        );
        await tx.image.delete({
          where: { id: post.bannerImage.id },
        });
      }

      // Delete all images from storage and database
      for (const image of post.images) {
        await this.storageService.deleteFile(image.bucketName, image.key);
        await tx.image.delete({
          where: { id: image.id },
        });
      }

      // Delete post (tags will cascade delete)
      await tx.post.delete({
        where: { id },
      });

      return { message: 'Post deleted successfully' };
    });
  }
}
