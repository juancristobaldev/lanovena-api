import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
// Asumo que tendrás una entidad base de ejercicios (Biblioteca de Drills)
// Si no la tienes aún, avísame para crearla. Aquí la importo como placeholder.

// src/modules/exercises/entities/exercise.entity.ts

@ObjectType()
export class ExerciseEntity {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  videoUrl?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field()
  category: string; // Ej: "Físico", "Táctico", "Técnico"
}

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

  @Field({ nullable: true })
  specificNotes?: string;

  // RELACIONES

  @Field(() => ExerciseEntity)
  exercise: ExerciseEntity;
  // Esta relación trae el nombre del ejercicio, la foto, el video, etc.
}
