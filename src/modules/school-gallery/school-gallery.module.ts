import { Module } from '@nestjs/common';
import { SchoolGalleryController } from './school-gallery.controller';
import { SchoolGalleryService } from './school-gallery.service';
import { HttpAuthGuard } from '../../auth/guards/http-auth.guard';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [SchoolGalleryController],
  providers: [SchoolGalleryService, HttpAuthGuard],
})
export class SchoolGalleryModule {}
