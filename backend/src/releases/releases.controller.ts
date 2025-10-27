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
import { ReleasesService } from './releases.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import type { User } from '@prisma/client';

@Controller('releases')
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

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
    @Body() createReleaseDto: CreateReleaseDto,
    @CurrentUser() user: User,
    @UploadedFiles()
    files: {
      bannerImage?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    const bannerImage = files?.bannerImage?.[0];
    const images = files?.images;

    return this.releasesService.create(
      createReleaseDto,
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
    @Query('includeInactive') includeInactive?: string,
    @CurrentUser() user?: User,
  ) {
    // Only admins can see inactive releases
    const canSeeInactive = user?.role === 'ADMIN' && includeInactive === 'true';
    return this.releasesService.findAll(page, limit, canSeeInactive);
  }

  @Get('artist/:artistId')
  @UseGuards(OptionalAuthGuard)
  async findByArtist(
    @Param('artistId') artistId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('includeInactive') includeInactive?: string,
    @CurrentUser() user?: User,
  ) {
    // Only admins can see inactive releases
    const canSeeInactive = user?.role === 'ADMIN' && includeInactive === 'true';
    return this.releasesService.findByArtist(
      artistId,
      page,
      limit,
      canSeeInactive,
    );
  }

  @Get('slug/:slug')
  @UseGuards(OptionalAuthGuard)
  async findBySlug(@Param('slug') slug: string) {
    return this.releasesService.findBySlug(slug);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.releasesService.findOne(id);
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
    @Body() updateReleaseDto: UpdateReleaseDto,
    @UploadedFiles()
    files: {
      bannerImage?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    const bannerImage = files?.bannerImage?.[0];
    const images = files?.images;

    return this.releasesService.update(
      id,
      updateReleaseDto,
      images,
      bannerImage,
    );
  }

  @Patch(':id/image-order')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async updateImageOrder(
    @Param('id') id: string,
    @Body('imageOrders') imageOrders: { imageId: string; order: number }[],
  ) {
    return this.releasesService.updateImageOrder(id, imageOrders);
  }

  @Patch(':id/images/:imageId/reorder')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async reorderSingleImage(
    @Param('id') releaseId: string,
    @Param('imageId') imageId: string,
    @Body('newOrder') newOrder: number,
  ) {
    return this.releasesService.reorderSingleImage(
      releaseId,
      imageId,
      newOrder,
    );
  }

  @Delete(':id/images/:imageId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async removeImage(
    @Param('id') releaseId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.releasesService.removeImage(releaseId, imageId);
  }

  @Patch(':id/deactivate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string) {
    return this.releasesService.deactivate(id);
  }

  @Patch(':id/activate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    return this.releasesService.activate(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.releasesService.remove(id);
  }
}
