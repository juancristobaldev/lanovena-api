import { Resolver, Mutation, Query, Args, Context, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TrainingSessionsService } from './training-sessions.service';
import {
  CreateTrainingSessionInput,
  TrainingSessionEntity,
  UpdateTrainingSessionInput,
} from 'src/entitys/training-session.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { AttendanceStatus, Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AttendanceEntity } from 'src/entitys/attendace-session.entity';

@Resolver(() => TrainingSessionEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class TrainingSessionsResolver {
  constructor(
    private readonly trainingSessionsService: TrainingSessionsService,
  ) {}

  /* ===========================================================================
   * MUTATIONS
   * =========================================================================== */
  @Mutation(() => AttendanceEntity)
  @Roles(Role.COACH, Role.DIRECTOR)
  async registerAttendance(
    @Args('sessionId') sessionId: string,
    @Args('playerId') playerId: string,
    @Args('status') status: AttendanceStatus, // Crear este Enum en GraphQL
  ) {
    // Llama a un método nuevo en el servicio que haga un upsert en la tabla Attendance
    return this.trainingSessionsService.registerAttendance(
      sessionId,
      playerId,
      status,
    );
  }

  @Mutation(() => TrainingSessionEntity)
  @Roles(Role.DIRECTOR, Role.COACH)
  createTrainingSession(
    @Args('input') input: CreateTrainingSessionInput,
    @Context() context: any,
  ) {
    return this.trainingSessionsService.create(input as any, context.user);
  }

  @Mutation(() => TrainingSessionEntity)
  @Roles(Role.DIRECTOR, Role.COACH)
  updateTrainingSession(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('input') input: UpdateTrainingSessionInput,
    @Context() context: any,
  ) {
    return this.trainingSessionsService.update(
      sessionId,
      input as any,
      context.user.schoolId,
    );
  }

  @Mutation(() => Boolean)
  @Roles(Role.DIRECTOR)
  removeTrainingSession(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Context() context: any,
  ) {
    return this.trainingSessionsService.remove(
      sessionId,
      context.user.schoolId,
    );
  }

  /* ===========================================================================
   * QUERIES
   * =========================================================================== */

  @Query(() => [TrainingSessionEntity])
  @Roles(Role.DIRECTOR, Role.COACH, Role.GUARDIAN)
  trainingSessionsByCategory(
    @Args('categoryId', { type: () => ID }) categoryId: string,
    @Context() context: any,
  ) {
    return this.trainingSessionsService.findByCategory(
      categoryId,
      context.user.schoolId,
    );
  }

  @Query(() => TrainingSessionEntity)
  @Roles(Role.DIRECTOR, Role.COACH)
  trainingSession(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Context() context: any,
  ) {
    return this.trainingSessionsService.findOne(
      sessionId,
      context.user.schoolId,
    );
  }
}
