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
import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import type { User } from '@prisma/client';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

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
    @Body() createArtistDto: CreateArtistDto,
    @CurrentUser() user: User,
    @UploadedFiles()
    files: {
      bannerImage?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    const bannerImage = files?.bannerImage?.[0];
    const images = files?.images;

    return this.artistsService.create(
      createArtistDto,
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
    // Only admins can see inactive artists
    const canSeeInactive = user?.role === 'ADMIN' && includeInactive === 'true';
    return this.artistsService.findAll(page, limit, canSeeInactive);
  }

  @Get('slug/:slug')
  @UseGuards(OptionalAuthGuard)
  async findBySlug(@Param('slug') slug: string) {
    return this.artistsService.findBySlug(slug);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.artistsService.findOne(id);
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
    @Body() updateArtistDto: UpdateArtistDto,
    @UploadedFiles()
    files: {
      bannerImage?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    const bannerImage = files?.bannerImage?.[0];
    const images = files?.images;

    return this.artistsService.update(id, updateArtistDto, images, bannerImage);
  }

  @Patch(':id/image-order')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async updateImageOrder(
    @Param('id') id: string,
    @Body() imageOrders: { imageId: string; order: number }[],
  ) {
    return this.artistsService.updateImageOrder(id, imageOrders);
  }

  @Patch(':id/images/:imageId/reorder')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async reorderSingleImage(
    @Param('id') artistId: string,
    @Param('imageId') imageId: string,
    @Body('newOrder') newOrder: number,
  ) {
    return this.artistsService.reorderSingleImage(artistId, imageId, newOrder);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async removeImage(
    @Param('id') artistId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.artistsService.removeImage(artistId, imageId);
  }

  @Patch(':id/deactivate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string) {
    return this.artistsService.deactivate(id);
  }

  @Patch(':id/activate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    return this.artistsService.activate(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.artistsService.remove(id);
  }
}
