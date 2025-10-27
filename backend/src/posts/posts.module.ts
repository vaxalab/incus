import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
