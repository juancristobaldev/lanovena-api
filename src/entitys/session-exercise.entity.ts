import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ExerciseEntity } from './exercise.entity';
// Asumo que tendrás una entidad base de ejercicios (Biblioteca de Drills)
// Si no la tienes aún, avísame para crearla. Aquí la importo como placeholder.

// src/modules/exercises/entities/exercise.entity.ts

@ObjectType()
export class SessionExerciseEntity {
  @Field(() => ID)
  id: string;

  @Field(() => Int, {
    description: 'Duración en minutos para esta sesión específica',
  })
  durationMinutes: number;

  @Field(() => Int, {
    description: 'Orden de ejecución en la sesión (1, 2, 3...)',
  })
  orderIndex: number;

  @Field(() => String,{ nullable: true })
  specificNotes?: string;

  // RELACIONES

  @Field(() => ExerciseEntity)
  exercise: ExerciseEntity;
  // Esta relación trae el nombre del ejercicio, la foto, el video, etc.
}
