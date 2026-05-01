import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTestProtocolInput,
  UpdateTestProtocolInput,
} from '../../../entitys/methodology.entity';

@Injectable()
export class TestProtocolsService {
  constructor(private prisma: PrismaService) {}

  // Crear un protocolo (Generalmente por SuperAdmin)

  async create(input: CreateTestProtocolInput) {
    return await this.prisma.testProtocol.create({
      data: {
        ...input,
        isGlobal: true, // Por defecto asumimos que son creados para todos
      },
    });
  }
  async delete(id: string) {
    try {
      await this.prisma.testProtocol.delete({
        where: {
          id,
        },
      });
      return true;
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException(e);
    }
  }
  async update(id: string, input: UpdateTestProtocolInput) {
    return await this.prisma.testProtocol.update({
      where: { id: id },
      data: {
        ...input,
        isGlobal: true, // Por defecto asumimos que son creados para todos
      },
    });
  }

  async findAllGlobals() {
    return this.prisma.testProtocol.findMany({
      where: { isGlobal: true },
      orderBy: { category: 'asc' }, // Ordenados por categoría para agruparlos fácil en el UI
    });
  }

  // Obtener todos los protocolos disponibles (Globales)
  async findAll() {
    return this.prisma.testProtocol.findMany({
      where: { isGlobal: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.testProtocol.findUnique({ where: { id } });
  }
}
