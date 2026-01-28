import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  CreateSchoolInput,
  SchoolEntity,
  UpdateSchoolInput,
} from 'src/entitys/school.entity';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PlanType, Role, SchoolMode } from '@prisma/client';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { SchoolsService } from './schools.service';

@Resolver(() => SchoolEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class SchoolsResolver {
  constructor(private readonly schoolsService: SchoolsService) {}

  /* ===========================================================================
   *  MUTATIONS
   * =========================================================================== */

  /**
   * Crear nueva escuela (Tenant)
   * SOLO SuperAdmin
   */
  @Mutation(() => SchoolEntity)
  @Roles(Role.SUPERADMIN)
  createSchool(@Args('input') input: CreateSchoolInput) {
    return this.schoolsService.create(input);
  }

  /**
   * Actualizar datos generales de la escuela
   * Director de SU escuela o SuperAdmin
   */
  @Mutation(() => SchoolEntity)
  @Roles(Role.DIRECTOR)
  updateSchool(
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @Args('input') input: UpdateSchoolInput,
    @CurrentUser() user: any,
  ) {
    // Director solo puede editar su propia escuela
    if (user.role !== Role.SUPERADMIN && user.schoolId !== schoolId) {
      throw new Error('No autorizado para modificar esta escuela');
    }

    return this.schoolsService.update(schoolId, input);
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
    @Args('plan', { type: () => PlanType }) plan: PlanType,
  ) {
    return this.schoolsService.updatePlan(schoolId, plan);
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

  /**
   * Obtener escuela por ID
   * Director (su escuela) o SuperAdmin
   */
  @Query(() => SchoolEntity)
  @Roles(Role.DIRECTOR)
  schoolById(
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== Role.SUPERADMIN && user.schoolId !== schoolId) {
      throw new Error('Acceso denegado');
    }

    return this.schoolsService.findOne(schoolId);
  }

  /**
   * Resolver por slug (login / portal)
   * CUALQUIER usuario autenticado
   */
  @Query(() => SchoolEntity)
  schoolBySlug(@Args('slug', { type: () => String }) slug: string) {
    return this.schoolsService.findBySlug(slug);
  }
}
