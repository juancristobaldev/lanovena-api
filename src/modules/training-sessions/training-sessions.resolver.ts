import { Resolver, Mutation, Query, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { TrainingSessionsService } from './training-sessions.service';
import {
  CreateTrainingSessionInput,
  TrainingSessionEntity,
  UpdateTrainingSessionInput,
} from '../../entitys/training-session.entity';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { AttendanceStatus, Role } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AttendanceEntity } from '../../entitys/attendace-session.entity';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserEntity } from '../../entitys/user.entity';
import { PrismaService } from '../prisma/prisma.service';

@Resolver(() => TrainingSessionEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class TrainingSessionsResolver {
  constructor(
    private readonly trainingSessionsService: TrainingSessionsService,
    private readonly prisma: PrismaService, // Inyectamos Prisma
  ) {}

  @Mutation(() => TrainingSessionEntity)
  @Roles(Role.COACH, Role.DIRECTOR)
  async completeTrainingSession(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const schoolId = await this.getSchoolId(user);
    return this.trainingSessionsService.markAsCompleted(sessionId, schoolId);
  }

  @Mutation(() => AttendanceEntity) // O PlayerEvaluationEntity si creas una tabla aparte
  @Roles(Role.COACH, Role.DIRECTOR)
  async ratePlayerPerformance(
    @Args('sessionId') sessionId: string,
    @Args('playerId') playerId: string,
    @Args('rating', { type: () => Int }) rating: number,
    @Args('notes', { nullable: true }) notes: string,
    @CurrentUser() user: UserEntity,
  ) {
    // Aquí llamas al servicio. Normalmente esto actualiza la tabla Attendance
    // agregando campos 'rating' y 'feedback' a esa tabla, o crea un registro en PlayerEvaluation.
    return this.trainingSessionsService.ratePlayer(
      sessionId,
      playerId,
      rating,
      notes,
    );
  }

  /**
   * Helper para obtener el schoolId.
   * Si el usuario no lo tiene directo (ej: Director), lo busca en SchoolStaff.
   */
  private async getSchoolId(user: UserEntity): Promise<string> {
    // 1. Si ya viene en el usuario (ej: Coach logueado con contexto rico), úsalo.
    if (user.schoolId) return user.schoolId;

    // 2. Si es Director (o Coach sin contexto), búscalo en la tabla SchoolStaff
    const staff = await this.prisma.schoolStaff.findFirst({
      where: { userId: user.id },
      select: { schoolId: true }, // Solo traemos el ID
    });

    if (!staff || !staff.schoolId) {
      throw new UnauthorizedException(
        'No tienes una escuela asignada o permisos válidos.',
      );
    }

    return staff.schoolId;
  }

  /* ===========================================================================
   * MUTATIONS
   * =========================================================================== */

  @Mutation(() => AttendanceEntity)
  @Roles(Role.COACH, Role.DIRECTOR)
  async registerAttendance(
    @Args('sessionId') sessionId: string,
    @Args('playerId') playerId: string,
    @Args('status') status: AttendanceStatus,
    @CurrentUser() user: UserEntity,
  ) {
    // Validamos que el usuario pertenezca a una escuela (opcional, por seguridad)
    await this.getSchoolId(user);

    return this.trainingSessionsService.registerAttendance(
      sessionId,
      playerId,
      status,
    );
  }

  @Mutation(() => TrainingSessionEntity)
  @Roles(Role.COACH, Role.DIRECTOR) // Agregué Director por si acaso
  async createTrainingSession(
    @Args('input') input: CreateTrainingSessionInput,
    @CurrentUser() user: UserEntity,
  ) {
    // Obtenemos el ID real, ya sea del user o del staff
    // Pasamos el schoolId al servicio (asegúrate que tu servicio acepte este 2do param o inyéctalo en el input)
    // Opción A: Si tu servicio espera (input, schoolId)
    // return this.trainingSessionsService.create(input, schoolId);

    // Opción B (Lo más probable según tu código anterior): Inyectarlo en el input
    return this.trainingSessionsService.create({
      ...input,
      // schoolId: schoolId, // Descomenta si tu CreateInput tiene este campo oculto
    } as any);
  }

  @Mutation(() => TrainingSessionEntity)
  @Roles(Role.DIRECTOR, Role.COACH)
  async updateTrainingSession(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @Args('input') input: UpdateTrainingSessionInput,
    @CurrentUser() user: UserEntity,
  ) {
    const schoolId = await this.getSchoolId(user);

    return this.trainingSessionsService.update(
      sessionId,
      input as any,
      schoolId,
    );
  }

  @Mutation(() => Boolean)
  @Roles(Role.DIRECTOR)
  async removeTrainingSession(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const schoolId = await this.getSchoolId(user);
    return this.trainingSessionsService.remove(sessionId, schoolId);
  }

  /* ===========================================================================
   * QUERIES
   * =========================================================================== */

  @Query(() => [TrainingSessionEntity])
  @Roles(Role.DIRECTOR, Role.COACH, Role.GUARDIAN)
  async trainingSessionsByCategory(
    @Args('categoryId', { type: () => ID }) categoryId: string,
    @CurrentUser() user: UserEntity,
  ) {
    // Nota: Para GUARDIAN, la lógica podría ser distinta (ellos no están en SchoolStaff)
    // Si GUARDIAN también necesita validación, habría que ajustar el getSchoolId
    // asumiendo aquí que Director y Coach son los principales consumidores de esta lógica.

    if (user.role === Role.GUARDIAN) {
      // Lógica específica para guardián si es necesaria, o return null
      // return this.trainingSessionsService.findByCategoryForGuardian(categoryId);
    }

    const schoolId = await this.getSchoolId(user);

    return this.trainingSessionsService.findByCategory(categoryId, schoolId);
  }

  @Query(() => TrainingSessionEntity)
  @Roles(Role.DIRECTOR, Role.COACH)
  async trainingSession(
    @Args('sessionId', { type: () => ID }) sessionId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const schoolId = await this.getSchoolId(user);

    return this.trainingSessionsService.findOne(sessionId, schoolId);
  }
}
