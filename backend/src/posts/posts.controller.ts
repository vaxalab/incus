import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import type { User } from '@prisma/client';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'bannerImage', maxCount: 1 },
      { name: 'images', maxCount: 10 },
    ]),
  )
  async create(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser() user: User,
    @UploadedFiles()
    files: {
      bannerImage?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    const bannerImage = files?.bannerImage?.[0];
    const images = files?.images;

    return this.postsService.create(
      createPostDto,
      user.id,
      images,
      bannerImage,
    );
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('includeUnpublished') includeUnpublished?: string,
    @CurrentUser() user?: User,
  ) {
    // Only admins can see unpublished posts
    const canSeeUnpublished =
      user?.role === 'ADMIN' && includeUnpublished === 'true';
    return this.postsService.findAll(page, limit, canSeeUnpublished);
  }

  @Get('slug/:slug')
  @UseGuards(OptionalAuthGuard)
  async findBySlug(@Param('slug') slug: string) {
    return this.postsService.findBySlug(slug);
  }

  @Get('tags')
  @UseGuards(OptionalAuthGuard)
  async getTags() {
    return this.postsService.getTags();
  }

  @Post('tags')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createTag(
    @Body() createTagDto: { name: string; slug: string; color?: string },
  ) {
    return this.postsService.createTag(createTagDto);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'bannerImage', maxCount: 1 },
      { name: 'images', maxCount: 10 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFiles()
    files: {
      bannerImage?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    const bannerImage = files?.bannerImage?.[0];
    const images = files?.images;

    return this.postsService.update(id, updatePostDto, images, bannerImage);
  }

  @Patch(':id/image-order')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async updateImageOrder(
    @Param('id') id: string,
    @Body() imageOrders: { imageId: string; order: number }[],
  ) {
    return this.postsService.updateImageOrder(id, imageOrders);
  }

  @Patch(':id/images/:imageId/reorder')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async reorderSingleImage(
    @Param('id') postId: string,
    @Param('imageId') imageId: string,
    @Body('newOrder') newOrder: number,
  ) {
    return this.postsService.reorderSingleImage(postId, imageId, newOrder);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async removeImage(
    @Param('id') postId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.postsService.removeImage(postId, imageId);
  }

  @Patch(':id/publish')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string) {
    return this.postsService.publish(id);
  }

  @Patch(':id/unpublish')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async unpublish(@Param('id') id: string) {
    return this.postsService.unpublish(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }
}
