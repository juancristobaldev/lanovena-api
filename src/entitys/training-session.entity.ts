import { ObjectType, Field, InputType, ID, PartialType } from '@nestjs/graphql';
import { IsArray, IsDate, IsOptional, IsString, IsUUID } from 'class-validator';

@ObjectType()
export class TrainingSessionEntity {
  @Field(() => ID)
  id: string;

  @Field(() => Date)
  date: Date;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => ID)
  categoryId: string;

  // Opcional: Para devolver ejercicios en la query
  // Asumiendo que existe un ExerciseEntity, usamos 'Any' o definimos un DTO simple por ahora
  // @Field(() => [ExerciseEntity], { nullable: true })
  // exercises?: ExerciseEntity[];
}

@InputType()
export class CreateTrainingSessionInput {
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
}

@InputType()
export class UpdateTrainingSessionInput extends PartialType(
  CreateTrainingSessionInput,
) {}
