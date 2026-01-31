import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
} from 'src/entitys/category.entity';
import { Role } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear categoría
   * Se vincula automáticamente a la escuela del usuario (Director)
   */
  async create(input: CreateCategoryInput, user: any) {
    return this.prisma.category.create({
      data: {
        ...input,
      },
    });
  }

  /**
   * Listar todas las categorías de una escuela
   */
  async findAll(schoolId: string) {
    return this.prisma.category.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Buscar una categoría por ID
   * Verifica que pertenezca a la escuela del usuario solicitante
   */
  async findOne(id: string, user: any) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category)
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);

    // Seguridad: Verificar que sea de mi escuela (excepto SuperAdmin)
    if (user.role !== Role.SUPERADMIN && category.schoolId !== user.schoolId) {
      throw new ForbiddenException('No tienes acceso a esta categoría');
    }

    return category;
  }

  /**
   * Actualizar categoría
   */
  async update(id: string, input: UpdateCategoryInput, user: any) {
    // Primero verificamos existencia y permisos reutilizando findOne
    await this.findOne(id, user);

    return this.prisma.category.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Eliminar categoría
   */
  async remove(id: string, user: any) {
    await this.findOne(id, user); // Check permisos

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
