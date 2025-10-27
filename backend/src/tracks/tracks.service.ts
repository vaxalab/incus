import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import type {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';

@Injectable()
export class TracksService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    createTrackDto: CreateTrackDto,
    audioFile?: Express.Multer.File,
  ) {
    // Verify release exists
    const release = await this.databaseService.release.findUnique({
      where: { id: createTrackDto.releaseId },
    });

    if (!release) {
      throw new NotFoundException('Release not found');
    }

    // Check if track number already exists for this release
    const existingTrack = await this.databaseService.track.findFirst({
      where: {
        releaseId: createTrackDto.releaseId,
        trackNumber: createTrackDto.trackNumber,
      },
    });

    if (existingTrack) {
      throw new BadRequestException(
        `Track number ${createTrackDto.trackNumber} already exists for this release`,
      );
    }

    let audioFileRecord = null;

    // Upload audio file if provided
    if (audioFile) {
      const uploadResult = await this.storageService.uploadAudio(
        audioFile,
        true,
      ); // Public for streaming
      audioFileRecord = await this.databaseService.audioFile.findUnique({
        where: { id: uploadResult.id },
      });
    }

    // Create track
    const track = await this.databaseService.track.create({
      data: {
        title: createTrackDto.title,
        trackNumber: createTrackDto.trackNumber,
        releaseId: createTrackDto.releaseId,
        audioFileId: audioFileRecord?.id,
        duration: audioFileRecord?.duration,
      },
      include: {
        release: {
          select: {
            id: true,
            title: true,
            artist: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
    });

    return track;
  }

  async findAll() {
    const tracks = await this.databaseService.track.findMany({
      include: {
        release: {
          select: {
            id: true,
            title: true,
            artist: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
    });

    return tracks;
  }

  async findOne(id: string) {
    const track = await this.databaseService.track.findUnique({
      where: { id },
      include: {
        release: {
          select: {
            id: true,
            title: true,
            artist: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    return track;
  }

  async update(
    id: string,
    updateTrackDto: UpdateTrackDto,
    audioFile?: Express.Multer.File,
  ) {
    const track = await this.databaseService.track.findUnique({
      where: { id },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    let audioFileRecord = track.audioFileId
      ? await this.databaseService.audioFile.findUnique({
          where: { id: track.audioFileId },
        })
      : null;

    // Upload new audio file if provided
    if (audioFile) {
      // Delete existing audio file if it exists
      if (audioFileRecord) {
        await this.storageService.deleteFile(
          audioFileRecord.bucketName,
          audioFileRecord.key,
        );
        await this.databaseService.audioFile.delete({
          where: { id: audioFileRecord.id },
        });
      }

      // Upload new file
      const uploadResult = await this.storageService.uploadAudio(
        audioFile,
        true,
      );
      audioFileRecord = await this.databaseService.audioFile.findUnique({
        where: { id: uploadResult.id },
      });
    }

    // Check track number uniqueness if updating track number
    if (
      updateTrackDto.trackNumber &&
      updateTrackDto.trackNumber !== track.trackNumber
    ) {
      const existingTrack = await this.databaseService.track.findFirst({
        where: {
          releaseId: track.releaseId,
          trackNumber: updateTrackDto.trackNumber,
          id: { not: id },
        },
      });

      if (existingTrack) {
        throw new BadRequestException(
          `Track number ${updateTrackDto.trackNumber} already exists for this release`,
        );
      }
    }

    const updatedTrack = await this.databaseService.track.update({
      where: { id },
      data: {
        ...updateTrackDto,
        audioFileId: audioFileRecord?.id,
        duration: audioFileRecord?.duration,
      },
      include: {
        release: {
          select: {
            id: true,
            title: true,
            artist: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
    });

    return updatedTrack;
  }

  async remove(id: string) {
    const track = await this.databaseService.track.findUnique({
      where: { id },
      include: { audioFile: true },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    // Delete audio file if it exists
    if (track.audioFile) {
      await this.storageService.deleteFile(
        track.audioFile.bucketName,
        track.audioFile.key,
      );
      await this.databaseService.audioFile.delete({
        where: { id: track.audioFile.id },
      });
    }

    await this.databaseService.track.delete({
      where: { id },
    });

    return { message: 'Track deleted successfully' };
  }

  async stream(
    id: string,
    req: ExpressRequest,
    res: ExpressResponse,
  ): Promise<{ buffer: Buffer } | { error: string; status?: number }> {
    const track = await this.databaseService.track.findUnique({
      where: { id },
      include: { audioFile: true },
    });

    if (!track) {
      return { error: 'Track not found', status: 404 };
    }

    if (!track.audioFile) {
      return { error: 'Audio file not found for this track', status: 404 };
    }

    // Use the existing audio streaming functionality
    const audioFile = await this.storageService.findAudioFileById(
      track.audioFile.id,
    );

    if (!audioFile) {
      return { error: 'Audio file not found', status: 404 };
    }

    // Check if file is public or user has access
    if (!audioFile.isPublic) {
      // Check if user is authenticated for private files
      const user = req.user;
      if (!user) {
        return {
          error: 'Authentication required for private audio files',
          status: 401,
        };
      }
      // Add additional authorization checks here (user role, ownership, etc.)
    }

    try {
      const range = req.headers.range;

      if (range) {
        // Handle Range request for seeking
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : undefined;

        const { buffer, contentLength, totalSize } =
          await this.storageService.getFileRange(
            audioFile.bucketName,
            audioFile.key,
            start,
            end,
          );

        const actualEnd = end !== undefined ? end : totalSize - 1;

        // Set headers for partial content
        res.status(206);
        res.set({
          'Content-Type': audioFile.mimeType,
          'Content-Length': contentLength.toString(),
          'Content-Range': `bytes ${start}-${actualEnd}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        });

        return { buffer };
      } else {
        // Handle full file request
        const fileBuffer = await this.storageService.getFile(
          audioFile.bucketName,
          audioFile.key,
        );

        // Set appropriate headers for streaming
        res.set({
          'Content-Type': audioFile.mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        });

        return { buffer: fileBuffer };
      }
    } catch {
      return { error: 'Failed to stream audio file', status: 500 };
    }
  }
}
