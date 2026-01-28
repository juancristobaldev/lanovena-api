import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, School, SchoolMode, PlanType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  // ===========================================================================
  // 1. CREATE (Creación y Onboarding)
  // ===========================================================================
  async create(data: Prisma.SchoolCreateInput): Promise<School> {
    // 1. Validar Unicidad del Slug (Identificador de URL)
    const existing = await this.prisma.school.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ConflictException(
        'El identificador (slug) de la escuela ya existe. Por favor elige otro.',
      );
    }

    // 2. Creación con valores por defecto según reglas de negocio
    // El plan inicial siempre es "SEMILLERO" a menos que se especifique lo contrario.
    // El estado de suscripción comienza ACTIVO.
    return this.prisma.school.create({
      data: {
        ...data,
        planType: data.planType || PlanType.SEMILLERO,
        subscriptionStatus: 'ACTIVE',
        mode: data.mode || SchoolMode.COMMERCIAL, // Por defecto Comercial [cite: 7]
      },
    });
  }

  // ===========================================================================
  // 2. READ (Consultas)
  // ===========================================================================

  // Obtener todos los tenants (Vista SuperAdmin "Águila")
  // Incluye conteo de jugadores y usuarios para el Dashboard.
  async findAll(params?: { mode?: SchoolMode }): Promise<School[]> {
    const { mode } = params || {};

    return this.prisma.school.findMany({
      where: mode ? { mode } : undefined, // Filtro opcional por modo (Comercial vs Institucional)
      include: {
        _count: {
          select: {
            players: true, // Cuántos alumnos tiene
            users: true, // Cuántos miembros del staff
            categories: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obtener una escuela específica por ID
  async findOne(id: string): Promise<School> {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        categories: true, // Útil para el onboarding del Director
      },
    });

    if (!school) {
      throw new NotFoundException(`La escuela con ID ${id} no existe.`);
    }

    return school;
  }

  // Obtener una escuela por Slug (Para resolver la URL pública o del portal)
  async findBySlug(slug: string): Promise<School> {
    const school = await this.prisma.school.findUnique({
      where: { slug },
    });

    if (!school) {
      throw new NotFoundException(
        `No se encontró la escuela con slug: ${slug}`,
      );
    }

    return school;
  }

  // ===========================================================================
  // 3. UPDATE (Modificación y Gestión)
  // ===========================================================================

  async update(id: string, data: Prisma.SchoolUpdateInput): Promise<School> {
    // Verificamos existencia primero
    await this.findOne(id);

    // Si intentan cambiar el slug, verificamos que no choque con otro
    if (data.slug) {
      const slugCheck = await this.prisma.school.findUnique({
        where: { slug: data.slug as string },
      });
      if (slugCheck && slugCheck.id !== id) {
        throw new ConflictException(
          'El nuevo slug ya está en uso por otra escuela.',
        );
      }
    }

    return this.prisma.school.update({
      where: { id },
      data,
    });
  }

  // Método específico para cambiar el Modo (El "Switch") [cite: 6, 197]
  async switchMode(id: string, mode: SchoolMode): Promise<School> {
    const school = await this.findOne(id);

    // Aquí podrías agregar lógica extra: Si pasa a Institucional, cancelar deudas pendientes, etc.
    return this.prisma.school.update({
      where: { id },
      data: { mode },
    });
  }

  // Método para actualizar el Plan (Upgrade/Downgrade) [cite: 104, 116, 128]
  async updatePlan(id: string, newPlan: PlanType): Promise<School> {
    return this.prisma.school.update({
      where: { id },
      data: { planType: newPlan },
    });
  }

  // ===========================================================================
  // 4. DELETE (Eliminación)
  // ===========================================================================

  // Soft Delete (Recomendado): Solo desactiva la escuela para no perder historial
  async deactivate(id: string): Promise<School> {
    await this.findOne(id);

    return this.prisma.school.update({
      where: { id },
      data: {
        subscriptionStatus: 'CANCELLED',
        // Opcional: active: false si agregaste ese campo al modelo
      },
    });
  }

  // Hard Delete (Peligroso): Elimina físicamente el registro
  // Requiere configurar "Cascading Deletes" en el esquema Prisma o fallará si tiene datos hijos
  async remove(id: string): Promise<School> {
    await this.findOne(id);

    try {
      return await this.prisma.school.delete({
        where: { id },
      });
    } catch (error) {
      // Manejo de error de llave foránea si Prisma no tiene cascade
      throw new BadRequestException(
        'No se puede eliminar la escuela porque tiene datos asociados (jugadores, entrenadores). Usa "deactivate" o limpia los datos primero.',
      );
    }
  }
}
