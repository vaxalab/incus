import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Response,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StreamableFile } from '@nestjs/common';
import type {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { TracksService } from './tracks.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileValidationPipe } from '../storage/pipes/file-validation.pipe';
import { AUDIO_UPLOAD_CONFIG } from '../storage/interfaces/upload-config.interface';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Post()
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('audioFile'))
  create(
    @Body() createTrackDto: CreateTrackDto,
    @UploadedFile(new FileValidationPipe(AUDIO_UPLOAD_CONFIG))
    audioFile: Express.Multer.File,
  ) {
    return this.tracksService.create(createTrackDto, audioFile);
  }

  @Get()
  findAll() {
    return this.tracksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tracksService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('audioFile'))
  update(
    @Param('id') id: string,
    @Body() updateTrackDto: UpdateTrackDto,
    @UploadedFile(new FileValidationPipe(AUDIO_UPLOAD_CONFIG))
    audioFile?: Express.Multer.File,
  ) {
    return this.tracksService.update(id, updateTrackDto, audioFile);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(AuthGuard, RolesGuard)
  remove(@Param('id') id: string) {
    return this.tracksService.remove(id);
  }

  @Get(':id/stream')
  @UseGuards(OptionalAuthGuard)
  async stream(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.tracksService.stream(id, req, res);

    if ('error' in result) {
      res.status(result.status || 500);
      return result;
    }

    return new StreamableFile(result.buffer);
  }
}
