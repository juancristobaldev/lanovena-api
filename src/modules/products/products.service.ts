// products/products.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductInput,
  UpdateProductInput,
} from '../../entitys/product.entity';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateProductInput) {
    // GUARDRAIL 1: Verificar configuración de la Escuela
    const school = await this.prisma.school.findUnique({
      where: { id: data.schoolId },
    });

    if (!school) throw new BadRequestException('Escuela no encontrada');

    // Regla: Solo Modo Comercial puede vender [cite: 7]
    if (school.mode !== 'COMMERCIAL') {
      throw new ForbiddenException(
        'Las escuelas institucionales no pueden tener tienda.',
      );
    }

    const director = await this.prisma.schoolStaff.findFirst({
      where: { schoolId: data.schoolId, role: Role.DIRECTOR },
      select: {
        user: {
          select: {
            planLimitId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!director?.user?.planLimitId) {
      throw new ForbiddenException('Tu escuela no tiene un plan asignado.');
    }

    return this.prisma.product.create({ data });
  }

  async findAllBySchool(schoolId: string, onlyActive: boolean = false) {
    return this.prisma.product.findMany({
      where: {
        schoolId,
        ...(onlyActive ? { active: true, stock: { gt: 0 } } : {}), // Para apoderados solo mostramos con stock
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateProductInput) {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Soft delete preferido para no romper historiales de compra pasados
    return this.prisma.product.update({
      where: { id },
      data: { active: false },
    });
  }
}
