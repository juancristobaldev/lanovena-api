// products/products.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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

    // Regla: Plan Semillero no tiene acceso a Tienda [cite: 115]
    if (school.planType === 'SEMILLERO') {
      throw new ForbiddenException(
        'Tu plan actual (Semillero) no incluye Tienda Oficial. Actualiza a Profesional.',
      );
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
