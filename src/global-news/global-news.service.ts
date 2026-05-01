import {
  CreateGlobalNoticeInput,
  UpdateGlobalNoticeInput,
} from '@/entitys/global-news.entity';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { TargetAudience } from '@prisma/client';

@Injectable()
export class GlobalNewsService {
  constructor(private prisma: PrismaService) {}
  async create(input: CreateGlobalNoticeInput) {
    return this.prisma.globalNotice.create({
      data: {
        ...input,
      },
    });
  }

  // 📄 Obtener todos
  async findAll(targetAudience?: TargetAudience) {
    return this.prisma.globalNotice.findMany({
      ...(targetAudience
        ? {
            where: {
              OR: [
                {
                  targetAudience,
                },
                { targetAudience: null },
              ],
            },
          }
        : {}),
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // 📄 Obtener uno
  async findOne(id: string) {
    const notice = await this.prisma.globalNotice.findUnique({
      where: { id },
    });

    if (!notice) {
      throw new NotFoundException('GlobalNotice no encontrado');
    }

    return notice;
  }

  // ✏️ Actualizar
  async update(input: UpdateGlobalNoticeInput) {
    const { id, ...data } = input;

    // Validar existencia
    await this.findOne(id);

    return this.prisma.globalNotice.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  // 🗑️ Eliminar
  async remove(id: string) {
    // Validar existencia
    await this.findOne(id);

    await this.prisma.globalNotice.delete({
      where: { id },
    });

    return true;
  }
}
