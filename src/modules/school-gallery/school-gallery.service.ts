import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

type AuthUser = {
  id: string;
  role: Role;
  schoolId?: string;
};

@Injectable()
export class SchoolGalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async listBySchool(schoolId: string, user: AuthUser) {
    await this.assertCanAccessSchool(schoolId, user);

    return this.prisma.schoolGalleryPhoto.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(schoolId: string, user: AuthUser, key: string, caption?: string) {
    await this.assertCanManageSchoolGallery(schoolId, user);

    return this.prisma.schoolGalleryPhoto.create({
      data: {
        schoolId,
        key,
        caption,
        createdById: user.id,
      },
    });
  }

  async remove(schoolId: string, photoId: string, user: AuthUser) {
    await this.assertCanManageSchoolGallery(schoolId, user);

    const photo = await this.prisma.schoolGalleryPhoto.findFirst({
      where: {
        id: photoId,
        schoolId,
      },
    });

    if (!photo) {
      throw new NotFoundException('Foto no encontrada');
    }

    await this.s3.deleteFile(photo.key);

    await this.prisma.schoolGalleryPhoto.delete({
      where: { id: photo.id },
    });

    return { success: true };
  }

  private async assertCanAccessSchool(schoolId: string, user: AuthUser) {
    if (user.role === Role.SUPERADMIN) {
      return;
    }

    if (user.role === Role.GUARDIAN) {
      if (user.schoolId !== schoolId) {
        throw new ForbiddenException('No puedes ver la galeria de esta escuela');
      }
      return;
    }

    if (user.role === Role.DIRECTOR) {
      const schoolMembership = await this.prisma.schoolStaff.findFirst({
        where: {
          userId: user.id,
          schoolId,
          role: Role.DIRECTOR,
        },
      });

      if (!schoolMembership) {
        throw new ForbiddenException('No tienes acceso a esta escuela');
      }
      return;
    }

    throw new ForbiddenException('Rol no autorizado para ver la galeria');
  }

  private async assertCanManageSchoolGallery(schoolId: string, user: AuthUser) {
    if (user.role === Role.SUPERADMIN) {
      return;
    }

    if (user.role !== Role.DIRECTOR) {
      throw new ForbiddenException('Solo el director puede administrar la galeria');
    }

    const schoolMembership = await this.prisma.schoolStaff.findFirst({
      where: {
        userId: user.id,
        schoolId,
        role: Role.DIRECTOR,
      },
    });

    if (!schoolMembership) {
      throw new ForbiddenException(
        'No puedes administrar la galeria de esta escuela',
      );
    }
  }
}
