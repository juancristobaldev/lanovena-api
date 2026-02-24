import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, School, SchoolMode, PlanType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBenefitInput,
  ResourceUsage,
  SchoolEntity,
} from '../../entitys/school.entity';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async getSchoolDirectory(schoolId: string) {
    // 1. Validar que la escuela existe
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) throw new NotFoundException('Escuela no encontrada');

    // 2. Obtener Entrenadores (incluyendo su perfil y categorías)
    const coaches = await this.prisma.user.findMany({
      where: {
        schoolId: schoolId,
        role: Role.COACH,
      },
      include: {
        coachProfile: {
          include: {
            categories: true,
          },
        },
      },
    });

    // 3. Obtener Apoderados (incluyendo a los jugadores a su cargo)
    const guardians = await this.prisma.user.findMany({
      where: {
        schoolId: schoolId,
        role: Role.GUARDIAN,
      },
      include: {
        managedPlayers: true,
      },
    });

    // 4. Obtener Jugadores (incluyendo su categoría y datos de su apoderado)
    const players = await this.prisma.player.findMany({
      where: {
        schoolId: schoolId,
      },
      include: {
        category: true,
        guardian: true,
      },
    });

    return {
      coaches,
      guardians,
      players,
    };
  }

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
  async findAllByDirector(directorId: any): Promise<School[]> {
    return this.prisma.school.findMany({
      where: {
        staff: {
          some: {
            userId: directorId,
          },
        },
      },
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
  async findOne(id: string): Promise<SchoolEntity> {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        categories: true, // Útil para el onboarding del Director
        _count: {
          select: {
            players: true,
            categories: true,
          },
        },
      },
    });

    const coaches = await this.prisma.coach.count({
      where: {
        categories: {
          some: {
            schoolId: id,
          },
        },
      },
    });

    const users = await this.prisma.user.count({
      where: {
        role: 'GUARDIAN',
        schoolId: id,
      },
    });

    if (!school) {
      throw new NotFoundException(`La escuela con ID ${id} no existe.`);
    }

    return {
      ...school,
      bankDetails: undefined,
      logoUrl: school.logoUrl || '',
      _count: {
        coaches,
        players: school._count.players,
        categories: school._count.categories,
        guardians: users,
      },
    };
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
  async checkResourceLimit(
    schoolId: string,
    resource: 'PLAYER' | 'CATEGORY' | 'COACH',
  ): Promise<void> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: { players: true, categories: true, users: true }, // Asumimos users filtrados por rol COACH
        },
      },
    });

    if (!school) throw new NotFoundException('Escuela no encontrada');

    // Definición de Límites (Hardcoded según doc, idealmente mover a DB 'PlanLimit')
    const LIMITS = {
      [PlanType.SEMILLERO]: { MAX_PLAYERS: 80, MAX_CATS: 6, MAX_COACHES: 3 },
      [PlanType.PROFESIONAL]: {
        MAX_PLAYERS: 250,
        MAX_CATS: 12,
        MAX_COACHES: 10,
      },
      [PlanType.ALTO_RENDIMIENTO]: {
        MAX_PLAYERS: 99999,
        MAX_CATS: 999,
        MAX_COACHES: 999,
      },
      [PlanType.GOLD_NETWORK]: {
        MAX_PLAYERS: 99999,
        MAX_CATS: 999,
        MAX_COACHES: 999,
      },
    };

    const currentPlan = LIMITS[school.planType];

    if (
      resource === 'PLAYER' &&
      school._count.players >= currentPlan.MAX_PLAYERS
    ) {
      throw new BadRequestException(
        `Has alcanzado el límite de ${currentPlan.MAX_PLAYERS} jugadores de tu plan ${school.planType}. Actualiza a Profesional.`,
      );
    }

    if (
      resource === 'CATEGORY' &&
      school._count.categories >= currentPlan.MAX_CATS
    ) {
      throw new BadRequestException(
        `Límite de categorías alcanzado (${currentPlan.MAX_CATS}). Necesitas un plan mejor.`,
      );
    }

    // Nota: Para coaches es más complejo porque 'users' incluye guardianes.
    // Aquí simplificamos, pero deberías hacer un count con where: { role: 'COACH' }
  }

  /**
   * Devuelve un reporte de uso para mostrar barras de progreso en el Dashboard del Director
   */
  async getResourceUsage(schoolId: string): Promise<ResourceUsage> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: { _count: { select: { players: true, categories: true } } },
    });

    if (!school) throw new NotFoundException('Escuela no encontrada');
    const LIMITS = {
      [PlanType.SEMILLERO]: { MAX_PLAYERS: 80, MAX_CATS: 6 },
      [PlanType.PROFESIONAL]: { MAX_PLAYERS: 250, MAX_CATS: 12 },
      [PlanType.ALTO_RENDIMIENTO]: { MAX_PLAYERS: 9999, MAX_CATS: 999 },
      [PlanType.GOLD_NETWORK]: { MAX_PLAYERS: 9999, MAX_CATS: 999 },
    };

    const limits = LIMITS[school.planType];

    return {
      currentPlayers: school._count.players,
      maxPlayers: limits.MAX_PLAYERS,
      currentCategories: school._count.categories,
      maxCategories: limits.MAX_CATS,
      canAddPlayer: school._count.players < limits.MAX_PLAYERS,
      canAddCategory: school._count.categories < limits.MAX_CATS,
    };
  }

  // =========================================================
  // 🏛️ NUEVA LÓGICA MODO INSTITUCIONAL (BENEFICIOS)
  // =========================================================

  async addBenefit(schoolId: string, input: CreateBenefitInput) {
    // Validar que la escuela sea INSTITUCIONAL
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) throw new NotFoundException('Escuela no encontrada');

    if (school.mode !== SchoolMode.INSTITUTIONAL) {
      throw new BadRequestException(
        'Los beneficios solo están disponibles para Escuelas Institucionales (Municipales).',
      );
    }

    return this.prisma.benefit.create({
      data: {
        schoolId,
        title: input.title,
        description: input.description,
        active: true,
      },
    });
  }

  async removeBenefit(schoolId: string, benefitId: string) {
    // Validar propiedad
    const benefit = await this.prisma.benefit.findFirst({
      where: { id: benefitId, schoolId },
    });
    if (!benefit) throw new NotFoundException('Beneficio no encontrado');

    return this.prisma.benefit.delete({ where: { id: benefitId } });
  }

  async getBenefits(schoolId: string) {
    return this.prisma.benefit.findMany({ where: { schoolId } });
  }
}
