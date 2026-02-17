import {
  ObjectType,
  Field,
  InputType,
  ID,
  PartialType,
  Int,
  registerEnumType,
} from '@nestjs/graphql';
import { IsArray, IsDate, IsOptional, IsString, IsUUID } from 'class-validator';
import { CategoryEntity } from './category.entity';
import { SessionExerciseEntity } from './session-exercise.entity';
import { AttendanceEntity } from './attendace-session.entity';
import { TacticalBoardEntity } from './tactical-board.entity';
import { SessionStatus } from '@prisma/client';

registerEnumType(SessionStatus, {
  name: 'SessionStatus',
});

@ObjectType()
export class SessionTacticalBoardEntity {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  sessionId: string;

  @Field(() => String)
  boardId: string;

  @Field(() => Int)
  orderIndex: number; // Para saber el orden en la sesión

  @Field(() => String, { nullable: true })
  notes?: string;

  // RELACIÓN: Esto es lo importante para el Frontend
  @Field(() => TacticalBoardEntity)
  tacticalBoard: TacticalBoardEntity;
}

@ObjectType()
export class TrainingSessionEntity {
  @Field(() => ID)
  id: string;

  @Field(() => Date)
  date: Date;

  @Field(() => SessionStatus)
  status: SessionStatus;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => ID)
  categoryId: string;

  @Field(() => CategoryEntity)
  category: CategoryEntity;

  // ✅ FALTA ESTO: Para pintar los ejercicios en la pantalla
  @Field(() => [SessionExerciseEntity], { nullable: true })
  exercises?: SessionExerciseEntity[];

  // ✅ FALTA ESTO: Para saber quién ya llegó (Attendance)
  @Field(() => [AttendanceEntity], { nullable: true })
  attendance?: AttendanceEntity[];

  @Field(() => [SessionTacticalBoardEntity], { nullable: true })
  tacticalBoards?: SessionTacticalBoardEntity[];

  @Field(() => Int, { nullable: true })
  rating?: number;

  // Opcional: Para devolver ejercicios en la query
  // Asumiendo que existe un ExerciseEntity, usamos 'Any' o definimos un DTO simple por ahora
  // @Field(() => [ExerciseEntity], { nullable: true })
  // exercises?: ExerciseEntity[];
}

@InputType()
export class CreateTrainingSessionInput {
  @Field(() => String)
  title: string;
  @Field(() => String)
  location: string;
  @Field(() => Date)
  @IsDate()
  date: Date;
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  notes?: string;
  @Field(() => ID)
  @IsUUID()
  categoryId: string;
  @Field(() => [ID], { nullable: true, description: 'IDs de los ejercicios' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  exerciseIds?: string[];

  @Field(() => [ID], {
    nullable: true,
    description: 'IDs de las pizarras tácticas',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tacticalBoardIds?: string[];
}

@InputType()
export class UpdateTrainingSessionInput extends PartialType(
  CreateTrainingSessionInput,
) {}
