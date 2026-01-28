import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTestProtocolInput } from 'src/entitys/methodology.entity';

@Injectable()
export class TestProtocolsService {
  constructor(private prisma: PrismaService) {}

  // Crear un protocolo (Generalmente por SuperAdmin)
  async create(input: CreateTestProtocolInput) {
    return this.prisma.testProtocol.create({
      data: {
        ...input,
        isGlobal: true, // Por defecto asumimos que son creados para todos
      },
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
