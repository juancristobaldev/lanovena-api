import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { Roles } from '../../auth/decorators/roles.decorator';
import {
  CreateExerciseInput,
  ExerciseEntity,
} from '../../entitys/exercise.entity';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserEntity } from '../../entitys/user.entity';
import { ExerciseService } from './exercise.service';
import { PrismaService } from '../prisma/prisma.service';

@Resolver(() => ExerciseEntity)
@UseGuards(GqlAuthGuard)
export class ExerciseResolver {
  constructor(
    private readonly exercisesService: ExerciseService,
    private readonly prisma: PrismaService,
  ) {}

  @Mutation(() => ExerciseEntity)
  @UseGuards(GqlAuthGuard)
  @Roles(Role.DIRECTOR) // Solo directores crean metodología base
  async createExercise(
    @Args('schoolId') schoolId: string,
    @Args('input') createExerciseInput: CreateExerciseInput,
    @CurrentUser() user: UserEntity,
  ) {
    const staff = await this.prisma.schoolStaff.findFirst({
      where: {
        schoolId: schoolId,
        userId: user.id,
      },
    });

    if (!staff || staff.role !== 'DIRECTOR') {
      throw new Error(
        'No tienes permisos para crear ejercicios en esta escuela',
      );
    }

    return this.exercisesService.create(createExerciseInput, staff.schoolId);
  }

  @Mutation(() => ExerciseEntity)
  @UseGuards(GqlAuthGuard)
  @Roles(Role.DIRECTOR) // Solo directores crean metodología base
  async updateExercise(
    @Args('id') id: string,
    @Args('input') createExerciseInput: CreateExerciseInput,
    @CurrentUser() user: UserEntity,
  ) {
    console.log({ user });
    const staff = await this.prisma.exercise.findFirst({
      where: {
        id,
        school: {
          staff: {
            some: {
              id: user.sub,
              role: 'DIRECTOR',
            },
          },
        },
      },
    });

    if (!staff) {
      throw new Error(
        'No tienes permisos para crear ejercicios en esta escuela',
      );
    }

    return this.exercisesService.update(id, createExerciseInput);
  }

  @Query(() => ExerciseEntity, { name: 'exerciseFindById' })
  @UseGuards(GqlAuthGuard)
  @Roles(Role.DIRECTOR, Role.COACH) // Los entrenadores pueden VER, el director GESTIONA
  findById(
    @Args('exerciseId') exerciseId: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.exercisesService.findById(user, exerciseId);
  }

  @Query(() => [ExerciseEntity], { name: 'mySchoolExercises' })
  @UseGuards(GqlAuthGuard)
  @Roles(Role.DIRECTOR, Role.COACH) // Los entrenadores pueden VER, el director GESTIONA
  findAll(@Args('schoolId') schoolId: string, @CurrentUser() user: UserEntity) {
    return this.exercisesService.findAllBySchool(user, schoolId);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  @Roles(Role.DIRECTOR)
  removeExercise(@Args('id') id: string, @CurrentUser() user: UserEntity) {
    return this.exercisesService.remove(id, user);
  }
}
