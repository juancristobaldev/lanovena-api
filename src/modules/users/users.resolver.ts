import { Resolver, Query, Mutation, Args, Context, ID } from '@nestjs/graphql';
import {
  UseGuards,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from 'src/entitys/user.entity';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { CoachEntity } from 'src/entitys/coach.entity';

@Resolver(() => UserEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  /* ===========================================================================
   * MUTATIONS
   * =========================================================================== */

  /* ===========================================================================
   * MUTATIONS
   * =========================================================================== */

  @Mutation(() => UserEntity)
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  createUser(
    @Args('input') input: CreateUserInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.usersService.createUser(input as any, user);
  }

  @Mutation(() => UserEntity)
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  updateUser(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('input') input: UpdateUserInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.usersService.updateUser(userId, input as any, user);
  }

  @Mutation(() => Boolean)
  @Roles(Role.SUPERADMIN)
  deactivateUser(@Args('userId', { type: () => ID }) userId: string) {
    return this.usersService.deactivateUser(userId);
  }

  @Query(() => [UserEntity])
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  async guardiansBySchool(
    @Args('schoolId', { type: () => String, nullable: true }) schoolId: string,
    @CurrentUser() user: UserEntity,
  ) {
    // Si es Director, forzamos su ID de escuela. Si es Admin, usa el parámetro.

    console.log(schoolId);

    if (!schoolId) throw new Error('School ID is required');

    const schools = await this.prisma.user.findMany({
      where: {
        role: 'GUARDIAN',
      },
    });

    console.log(schools);
    return this.prisma.user.findMany({
      where: {
        schoolId: schoolId,
      },
    });
  }

  @Query(() => [UserEntity])
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  usersByRole(
    @Args('role', { type: () => Role }) role: Role,
    @Args('schoolId', { type: () => String }) schoolId: string,
  ) {
    // Aprovechamos el schoolId del usuario autenticado para seguridad
    return this.prisma.user.findMany({
      where: {
        role: role,
        schoolId: schoolId,
      },
    });
  }

  // 2. CREAR APODERADO (ADMINISTRATIVO)
  @Mutation(() => UserEntity)
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  async createGuardian(
    @Args('input') input: CreateUserInput, // Reutiliza o crea un DTO con email, nombre, password
    @CurrentUser() user: UserEntity,
  ) {
    console.log({ user });

    const targetSchoolId =
      (user.role === 'SUPERADMIN' || user?.role === 'DIRECTOR') &&
      input.schoolId
        ? input.schoolId
        : user.schoolId;

    // Forzamos el rol GUARDIAN y la escuela
    return this.prisma.user.create({
      data: {
        ...input,
        role: 'GUARDIAN',
        schoolId: targetSchoolId,
      },
    });
  }

  /* ===========================================================================
   * QUERIES
   * =========================================================================== */

  @Query(() => [UserEntity])
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  users(@CurrentUser() user: UserEntity) {
    return this.usersService.findAll(user);
  }

  @Query(() => UserEntity)
  async me(@CurrentUser() user: UserEntity) {
    const findUser = await this.usersService.findById(user.id, user);

    console.log({ user });
    if (!findUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return findUser;
  }

  @Query(() => UserEntity)
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  userById(
    @Args('userId', { type: () => ID }) userId: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.usersService.findById(userId, user);
  }

  // En UsersResolver o CoachesResolver
  @Mutation(() => CoachEntity)
  async assignCategoriesToCoach(
    @Args('userId') userId: string,
    @Args('categoryIds', { type: () => [String] }) categoryIds: string[],
  ) {
    // Primero buscamos el ID del perfil de coach
    const coach = await this.prisma.coach.findUnique({ where: { userId } });

    if (!coach) throw new InternalServerErrorException('Coach not found');
    // Actualizamos la relación M:N
    return this.prisma.coach.update({
      where: { id: coach.id },
      data: {
        categories: {
          set: categoryIds.map((id) => ({ id })), // 'set' reemplaza las anteriores por las nuevas
        },
      },
    });
  }

  @Query(() => [UserEntity])
  @Roles(Role.DIRECTOR, Role.SUPERADMIN)
  coaches(
    @CurrentUser() user: UserEntity,
    @Args('schoolId', { type: () => ID, nullable: true }) schoolId?: string,
  ) {
    // Prioridad: Argumento explícito > Escuela del Usuario > Error
    const targetSchoolId = schoolId || user.schoolId;

    if (!targetSchoolId) {
      throw new ForbiddenException(
        'School ID es requerido para listar entrenadores',
      );
    }

    // Seguridad extra: Si NO es SuperAdmin, validar que solo consulte SU escuela
    if (
      user.role !== Role.SUPERADMIN &&
      user.role !== Role.DIRECTOR &&
      user.schoolId &&
      targetSchoolId !== user.schoolId
    ) {
      throw new ForbiddenException(
        'No tienes permiso para ver entrenadores de otra escuela',
      );
    }

    return this.usersService.findCoaches(targetSchoolId);
  }

  @Query(() => [UserEntity])
  @Roles(Role.DIRECTOR, Role.COACH, Role.SUPERADMIN)
  guardians(
    @CurrentUser() user: UserEntity,
    @Args('schoolId', { type: () => ID, nullable: true }) schoolId?: string,
  ) {
    const targetSchoolId = schoolId || user.schoolId;

    if (!targetSchoolId) {
      throw new ForbiddenException(
        'School ID es requerido para listar apoderados',
      );
    }

    // Seguridad extra
    if (
      user.role !== Role.SUPERADMIN &&
      user.role !== Role.DIRECTOR &&
      user.schoolId &&
      targetSchoolId !== user.schoolId
    ) {
      throw new ForbiddenException(
        'No tienes permiso para ver apoderados de otra escuela',
      );
    }

    return this.usersService.findGuardians(targetSchoolId);
  }
}
