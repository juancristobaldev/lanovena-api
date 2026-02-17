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
} from '../../entitys/user.entity';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CoachEntity } from '../../entitys/coach.entity';

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
    const data = {
      ...input,
      school: {
        connect: {
          id: input.schoolId,
        },
      },
    };
    delete data.schoolId;
    return this.usersService.createUser(data as any, user);
  }

  @Mutation(() => UserEntity)
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  async createCoach(
    @Args('input') input: CreateUserInput,
    @CurrentUser() user: UserEntity,
  ) {
    if (!input.schoolId) return null;

    const data = {
      ...input,
      school: {
        connect: {
          id: input.schoolId,
        },
      },
    };

    const createdUser = await this.prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        password: data.password,
        role: 'COACH',
        phone: data.phone,
        schoolId: data.schoolId,
        coachProfile: {
          create: {
            bio: '',
          },
        },
      },
    });

    return createdUser;
  }

  @Mutation(() => UserEntity)
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  updateUser(
    @Args('userId', { type: () => String }) userId: string,
    @Args('input') input: UpdateUserInput,
    @CurrentUser() user: UserEntity,
  ) {
    console.log({ userId, input, user });
    const updatedUser = this.usersService.updateUser(
      userId,
      input as any,
      user,
    );

    console.log({ updatedUser });
    return updatedUser;
  }

  @Mutation(() => Boolean)
  @Roles(Role.SUPERADMIN)
  deactivateUser(@Args('userId', { type: () => String }) userId: string) {
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
  async usersByRole(
    @Args('role', { type: () => Role }) role: Role,
    @Args('schoolId', { type: () => String }) schoolId: string,
  ) {
    console.log({ role, schoolId });
    // Aprovechamos el schoolId del usuario autenticado para seguridad
    const users = await this.prisma.user.findMany({
      where: {
        role: role,
        schoolId: schoolId,
      },
    });

    console.log({ users });

    return users;
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
  @Roles(Role.GUARDIAN)
  async meGuardian(@CurrentUser() user: UserEntity) {
    const findUser = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
      include: {
        managedPlayers: {
          include: {
            school: true,
            category: {
              include: {
                sessions: true,
                matches: true,
              },
            },
          },
        },
        school: true,
      },
    });

    console.log({ findUser, managedPlayers: findUser?.managedPlayers });
    if (!findUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    console.log({ ...findUser, managedPlayers: findUser.managedPlayers || [] });
    return { ...findUser, managedPlayers: findUser.managedPlayers || [] };
  }

  @Query(() => UserEntity)
  @Roles(Role.GUARDIAN)
  async meCoach(@CurrentUser() user: UserEntity) {
    const findUser = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
      include: {
        coachProfile: {
          include: {
            categories: {
              include: {
                players: true,
                matches: true,
                sessions: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!findUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return findUser;
  }
  @Query(() => UserEntity)
  @Roles(Role.GUARDIAN)
  async getMyPlayersCarnet(@CurrentUser() user: UserEntity) {
    const findUser = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
      include: {
        managedPlayers: {
          include: {
            category: true,
            school: true,
          },
        },
      },
    });

    console.log({ findUser, managedPlayers: findUser?.managedPlayers });
    if (!findUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    console.log({ ...findUser, managedPlayers: findUser.managedPlayers || [] });
    return { ...findUser, managedPlayers: findUser.managedPlayers || [] };
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
    const coachUp = await this.prisma.coach.update({
      where: { id: coach.id },
      data: {
        categories: {
          set: categoryIds.map((id) => ({ id })), // 'set' reemplaza las anteriores por las nuevas
        },
      },
      include: {
        user: true,
      },
    });

    console.log({ coachUp });
    return coachUp;
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

    console.log({ targetSchoolId });
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
