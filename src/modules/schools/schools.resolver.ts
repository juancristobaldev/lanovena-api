import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  Benefit,
  CreateBenefitInput,
  CreateSchoolInput,
  DirectorPlan,
  ResourceUsage,
  SchoolDirectoryResponse,
  SchoolEntity,
  UpdateSchoolInput,
} from '../../entitys/school.entity';

import { Role, SchoolMode, User } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolsService } from './schools.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoachEntity } from '@/entitys/coach.entity';
import { UserEntity } from '@/entitys/user.entity';

@Resolver(() => SchoolEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class SchoolsResolver {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly prisma: PrismaService,
  ) {}

  /* ===========================================================================
   *  MUTATIONS
   * =========================================================================== */

  /**
   * Crear nueva escuela (Tenant)
   * SOLO SuperAdmin
   */

  @Query(() => SchoolDirectoryResponse, { name: 'getSchoolDirectory' })
  @Roles(Role.DIRECTOR, Role.SUPERADMIN, Role.SUBADMIN)
  async getSchoolDirectory(
    @Args('schoolId', { type: () => String }) schoolId: string,
  ) {
    return this.schoolsService.getSchoolDirectory(schoolId);
  }

  @Query(() => [UserEntity], { name: 'getCoachsBySchoolId' })
  @Roles(Role.DIRECTOR, Role.SUPERADMIN, Role.SUBADMIN)
  async getCoachsBySchoolId(
    @Args('schoolId', { type: () => String }) schoolId: string,
  ) {
    return await this.prisma.user.findMany({
      where: {
        schoolId,
        role: Role.COACH,
      },
      include: {
        coachProfile: true,
      },
    });
  }

  @Query(() => SchoolEntity)
  @Roles(Role.DIRECTOR, Role.SUPERADMIN, Role.SUBADMIN)
  async getSettings(
    @Args('schoolId', { type: () => String }) schoolId: string,
  ) {
    return this.schoolsService.findOne(schoolId);
  }

  @Mutation(() => SchoolEntity)
  @Roles(Role.DIRECTOR)
  createSchool(
    @CurrentUser() user: User,
    @Args('input') input: CreateSchoolInput,
  ) {
    return this.schoolsService.create({
      ...input,
      staff: {
        create: {
          role: Role.DIRECTOR,
          userId: user?.id,
        },
      },
    });
  }

  /**
   * Actualizar datos generales de la escuela
   * Director de SU escuela o SuperAdmin
   */
  @Mutation(() => SchoolEntity)
  @Roles(Role.DIRECTOR, Role.SUBADMIN)
  updateSchool(
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @Args('input') input: UpdateSchoolInput,
    @CurrentUser() user: any,
  ) {
    if (user.role === Role.SUPERADMIN) {
      return this.schoolsService.update(schoolId, input);
    }

    if (user.role === Role.SUBADMIN) {
      return this.prisma.school
        .findFirst({
          where: {
            id: schoolId,
            macroEntity: {
              adminId: user.id,
            },
          },
        })
        .then((school) => {
          if (!school) {
            throw new Error('No autorizado para modificar esta escuela');
          }

          return this.schoolsService.update(schoolId, input);
        });
    }

    return this.prisma.schoolStaff
      .findFirst({
        where: {
          schoolId,
          userId: user.id,
          role: Role.DIRECTOR,
        },
      })
      .then((staff) => {
        if (!staff) {
          throw new Error('No autorizado para modificar esta escuela');
        }

        return this.schoolsService.update(schoolId, input);
      });
  }

  /**
   * Switch Comercial / Institucional
   * Decisión estratégica → SOLO SuperAdmin
   */
  @Mutation(() => SchoolEntity)
  @Roles(Role.SUPERADMIN)
  switchSchoolMode(
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @Args('mode', { type: () => SchoolMode }) mode: SchoolMode,
  ) {
    return this.schoolsService.switchMode(schoolId, mode);
  }

  /**
   * Upgrade / Downgrade de Plan
   * SOLO SuperAdmin (facturación)
   */
  @Mutation(() => SchoolEntity)
  @Roles(Role.SUPERADMIN)
  updateSchoolPlan(
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @Args('planLimitId', { type: () => String }) planLimitId: string,
  ) {
    return this.schoolsService.updatePlan(schoolId, planLimitId);
  }

  /**
   * Desactivar escuela (soft delete)
   * SOLO SuperAdmin
   */
  @Mutation(() => SchoolEntity)
  @Roles(Role.SUPERADMIN)
  deactivateSchool(@Args('schoolId', { type: () => ID }) schoolId: string) {
    return this.schoolsService.deactivate(schoolId);
  }

  /* ===========================================================================
   *  QUERIES
   * =========================================================================== */

  /**
   * Vista Águila – todas las escuelas
   * SOLO SuperAdmin
   */
  @Query(() => [SchoolEntity])
  @Roles(Role.SUPERADMIN)
  schools(
    @Args('mode', {
      type: () => SchoolMode,
      nullable: true,
    })
    mode?: SchoolMode,
  ) {
    return this.schoolsService.findAll({ mode });
  }

  @Query(() => [SchoolEntity])
  @Roles(Role.DIRECTOR)
  schoolsByDirector(@CurrentUser() user: User) {
    return this.schoolsService.findAllByDirector(user?.id);
  }
  /**
   * Obtener escuela por ID
   * Director (su escuela) o SuperAdmin
   */
  @Query(() => SchoolEntity)
  @Roles(Role.DIRECTOR, Role.SUBADMIN)
  async schoolById(
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @CurrentUser() user: any,
  ) {
    if (user.role === Role.SUBADMIN) {
      const school = await this.prisma.school.findFirst({
        where: {
          id: schoolId,
          macroEntity: {
            adminId: user.id,
          },
        },
      });

      if (!school) {
        throw new Error('Acceso denegado');
      }

      return await this.schoolsService.findOne(schoolId);
    }

    const staff = await this.prisma.schoolStaff.findFirst({
      where: {
        schoolId,
        userId: user.id,
      },
    });

    if (!staff) {
      throw new Error('Acceso denegado');
    }

    return await this.schoolsService.findOne(schoolId);
  }

  /**
   * Resolver por slug (login / portal)
   * CUALQUIER usuario autenticado
   */
  @Query(() => SchoolEntity)
  schoolBySlug(@Args('slug', { type: () => String }) slug: string) {
    return this.schoolsService.findBySlug(slug);
  }

  @Query(() => SchoolEntity)
  async mySchool(@CurrentUser() user: User) {
    if (!user.schoolId) return null;

    return this.schoolsService.findOne(user.schoolId);
  }

  // --- NUEVOS CAMPOS RESOLVIDOS (Campos dinámicos) ---

  @ResolveField(() => [Benefit], {
    description: 'Lista de beneficios (Solo modo Institucional)',
  })
  async benefits(@Parent() school: SchoolEntity) {
    if (school.mode !== 'INSTITUTIONAL') return [];
    return this.schoolsService.getBenefits(school.id);
  }

  @ResolveField(() => ResourceUsage, {
    description: 'Uso de cuotas del plan (Guardrails)',
  })
  async resourceUsage(@Parent() school: SchoolEntity) {
    return this.schoolsService.getResourceUsage(school.id);
  }

  @ResolveField(() => DirectorPlan, {
    description: 'Plan real de la escuela heredado desde su director',
    nullable: true,
  })
  async directorPlan(@Parent() school: SchoolEntity) {
    const director = await this.prisma.schoolStaff.findFirst({
      where: {
        schoolId: school.id,
        role: Role.DIRECTOR,
      },
      select: {
        user: {
          select: {
            flowSubscriptionStatus: true,
            planLimit: {
              select: {
                id: true,
                name: true,
                amount: true,
                interval: true,
                maxPlayersPerSchool: true,
                maxCategories: true,
                maxCoaches: true,
                maxSchools: true,
                maxGuardianPerPlayer: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!director?.user?.planLimit) {
      return {
        id: null,
        name: 'Sin plan',
        amount: null,
        interval: null,
        maxPlayers: null,
        maxCategories: null,
        maxCoaches: null,
        maxSchools: null,
        maxGuardianPerPlayer: null,
        flowSubscriptionStatus: director?.user?.flowSubscriptionStatus ?? null,
      };
    }

    return {
      id: director.user.planLimit.id,
      name: director.user.planLimit.name,
      amount: director.user.planLimit.amount,
      interval: director.user.planLimit.interval,
      maxPlayers: director.user.planLimit.maxPlayersPerSchool,
      maxCategories: director.user.planLimit.maxCategories,
      maxCoaches: director.user.planLimit.maxCoaches,
      maxSchools: director.user.planLimit.maxSchools,
      maxGuardianPerPlayer: director.user.planLimit.maxGuardianPerPlayer,
      flowSubscriptionStatus: director.user.flowSubscriptionStatus,
    };
  }

  // --- MUTATIONS PARA BENEFICIOS ---

  @Mutation(() => Benefit)
  async createBenefit(
    @CurrentUser() user: User,
    @Args('input') input: CreateBenefitInput,
  ) {
    if (!user.schoolId) return null;

    // TODO: Validar que user sea DIRECTOR
    return this.schoolsService.addBenefit(user.schoolId, input);
  }

  @Mutation(() => Benefit)
  async deleteBenefit(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ) {
    if (!user.schoolId) return null;

    return this.schoolsService.removeBenefit(user.schoolId, id);
  }
}
