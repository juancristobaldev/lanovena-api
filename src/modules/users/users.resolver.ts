import { Resolver, Query, Mutation, Args, Context, ID } from '@nestjs/graphql';
import {
  UseGuards,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
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
import * as bcrypt from 'bcrypt';

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

    const directorStaff = await this.prisma.schoolStaff.findFirst({
      where: {
        schoolId: input.schoolId,
        role: Role.DIRECTOR,
      },
      select: {
        user: {
          select: {
            planLimit: {
              select: {
                name: true,
                maxCoaches: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const maxCoaches = directorStaff?.user?.planLimit?.maxCoaches;
    if (!maxCoaches || maxCoaches <= 0) {
      throw new BadRequestException(
        'La escuela no tiene un límite de coaches configurado en su plan',
      );
    }

    const currentCoaches = await this.prisma.user.count({
      where: {
        schoolId: input.schoolId,
        role: Role.COACH,
        isActive: true,
      },
    });

    if (currentCoaches >= maxCoaches) {
      throw new BadRequestException(
        `Has alcanzado el límite de ${maxCoaches} coaches de tu plan ${directorStaff?.user?.planLimit?.name || ''}.`,
      );
    }

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
        photoUrl: data.photoUrl,
        password: await bcrypt.hash(data.password, 10),
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
  @Roles(Role.SUPERADMIN, Role.DIRECTOR, Role.SUBADMIN)
  async guardiansBySchool(
    @Args('schoolId', { type: () => String, nullable: true }) schoolId: string,
    @CurrentUser() user: UserEntity,
  ) {
    if (!schoolId) throw new Error('School ID is required');

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
        throw new ForbiddenException('No tienes acceso a esta escuela');
      }
    }

    if (user.role === Role.DIRECTOR && user.schoolId !== schoolId) {
      throw new ForbiddenException('No tienes acceso a esta escuela');
    }

    return this.prisma.user.findMany({
      where: {
        role: Role.GUARDIAN,
        schoolId: schoolId,
      },
      include: {
        managedPlayers: true,
      },
    });
  }

  @Query(() => [UserEntity])
  @Roles(Role.SUPERADMIN, Role.DIRECTOR, Role.SUBADMIN)
  async usersByRole(
    @Args('role', { type: () => Role }) role: Role,
    @Args('schoolId', { type: () => String }) schoolId: string,
    @CurrentUser() user: UserEntity,
  ) {
    console.log({ role, schoolId });
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
        throw new ForbiddenException('No tienes acceso a esta escuela');
      }
    }

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
    const hashedPassword = await bcrypt.hash(input.password, 10);

    return this.prisma.user.create({
      data: {
        ...input,
        password: hashedPassword,
        photoUrl: input.photoUrl,
        role: 'GUARDIAN',
        schoolId: targetSchoolId,
      },
    });
  }

  /* ===========================================================================
   * QUERIES
   * =========================================================================== */

  @Query(() => [UserEntity])
  @Roles(Role.SUPERADMIN, Role.DIRECTOR, Role.SUBADMIN)
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
            attendance: true,
            school: true,
            monthlyPayments: true,
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
  @Roles(Role.SUPERADMIN, Role.DIRECTOR, Role.SUBADMIN)
  userById(
    @Args('userId', { type: () => ID }) userId: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.usersService.findById(userId, user);
  }

  @Query(() => UserEntity)
  @Roles(Role.SUPERADMIN, Role.DIRECTOR, Role.SUBADMIN)
  async coachById(
    @Args('coachId', { type: () => ID }) coachId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const userId = user.id ?? user.sub;
    console.log({ userId }, 'coach by id');
    console.log({ userId }, 'coach by id');
    console.log({ userId }, 'coach by id');
    console.log({ userId }, 'coach by id');
    console.log({ userId }, 'coach by id');
    console.log({ userId }, 'coach by id');
    const coachs = await this.prisma.coach.findMany({
      where: {
        user: {
          school: {
            staff: {
              some: {
                userId: userId,
              },
            },
          },
        },
      },
    });

    console.log({ coachs });
    const coach = await this.usersService.getCoachById(coachId, userId);
    console.log({ coach }, 'coach by id');
    console.log({ coach }, 'coach by id');
    console.log({ coach }, 'coach by id');

    return coach;
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
        categories: true,
      },
    });

    console.log({ coachUp });
    return coachUp;
  }

  @Query(() => [UserEntity])
  @Roles(Role.DIRECTOR, Role.SUPERADMIN, Role.SUBADMIN)
  coaches(
    @CurrentUser() user: UserEntity,
    @Args('schoolId', { type: () => ID, nullable: true }) schoolId?: string,
  ) {
    // Prioridad: Argumento explícito > Escuela del Usuario > Error
    const targetSchoolId = schoolId || user.schoolId;

    console.log(targetSchoolId);
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

    console.log({ search: {} });
    return this.usersService.findCoaches(targetSchoolId);
  }

  @Query(() => [UserEntity])
  @Roles(Role.DIRECTOR, Role.COACH, Role.SUPERADMIN, Role.SUBADMIN)
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
