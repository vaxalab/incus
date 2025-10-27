import { Module } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { ReleasesController } from './releases.controller';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [ReleasesController],
  providers: [ReleasesService],
})
export class ReleasesModule {}
