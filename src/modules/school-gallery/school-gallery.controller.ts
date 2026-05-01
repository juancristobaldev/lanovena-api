import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SchoolGalleryService } from './school-gallery.service';
import { HttpAuthGuard } from '../../auth/guards/http-auth.guard';

@Controller('schools/:schoolId/gallery')
@UseGuards(HttpAuthGuard)
export class SchoolGalleryController {
  constructor(private readonly schoolGalleryService: SchoolGalleryService) {}

  @Get()
  list(@Param('schoolId') schoolId: string, @Req() req: any) {
    return this.schoolGalleryService.listBySchool(schoolId, req.user);
  }

  @Post()
  create(
    @Param('schoolId') schoolId: string,
    @Body('key') key: string,
    @Body('caption') caption: string,
    @Req() req: any,
  ) {
    if (!key || !key.trim()) {
      throw new BadRequestException('La key de la imagen es requerida');
    }

    return this.schoolGalleryService.create(schoolId, req.user, key, caption);
  }

  @Delete(':photoId')
  remove(
    @Param('schoolId') schoolId: string,
    @Param('photoId') photoId: string,
    @Req() req: any,
  ) {
    return this.schoolGalleryService.remove(schoolId, photoId, req.user);
  }
}
