import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSponsorshipInput } from 'src/entitys/growth.entity';

@Injectable()
export class SponsorshipsService {
  constructor(private prisma: PrismaService) {}

  // 1. Crear un nuevo patrocinio
  async create(schoolId: string, data: CreateSponsorshipInput) {
    return this.prisma.sponsorship.create({
      data: {
        ...data,
        schoolId,
        isActive: true,
      },
    });
  }

  // 2. Obtener banners activos para una ubicación específica (ej: "APP_HOME")
  async findActiveByLocation(schoolId: string, location: string) {
    const now = new Date();
    return this.prisma.sponsorship.findMany({
      where: {
        schoolId,
        location,
        isActive: true,
        startDate: { lte: now }, // Que ya haya empezado
        endDate: { gte: now }, // Que no haya terminado
      },
    });
  }

  // 3. Listar todos los patrocinios de una escuela (Panel Director)
  async findAllBySchool(schoolId: string) {
    return this.prisma.sponsorship.findMany({
      where: { schoolId },
      orderBy: { endDate: 'desc' },
    });
  }

  // 4. Desactivar un patrocinio
  async toggleStatus(id: string, isActive: boolean) {
    return this.prisma.sponsorship.update({
      where: { id },
      data: { isActive },
    });
  }
}
