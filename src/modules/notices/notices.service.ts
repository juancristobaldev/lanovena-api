import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CreateNoticeInput,
  UpdateNoticeInput,
} from 'src/entitys/notice.entity';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllBySchool(schoolId: string) {
    return this.prisma.notice.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, schoolId: string) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice || notice.schoolId !== schoolId) {
      throw new NotFoundException('Noticia no encontrada');
    }

    // Incrementar vistas de forma asíncrona (UX/Marketing tracking)
    this.prisma.notice
      .update({
        where: { id },
        data: { views: { increment: 1 } },
      })
      .catch(() => null);

    return notice;
  }

  async create(input: CreateNoticeInput) {
    return this.prisma.notice.create({
      data: {
        ...input,
        schoolId: input.schoolId,
      },
    });
  }

  async update(id: string, input: UpdateNoticeInput) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice) {
      throw new ForbiddenException(
        'No tienes permiso para editar esta noticia',
      );
    }

    return this.prisma.notice.update({
      where: { id },
      data: input,
    });
  }

  async remove(id: string) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice) {
      throw new ForbiddenException('No puedes eliminar esta noticia');
    }

    return this.prisma.notice.delete({ where: { id } });
  }
}
