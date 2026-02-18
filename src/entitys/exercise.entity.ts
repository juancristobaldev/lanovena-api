import {
  InputType,
  Field,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql'; // <--- 1. Agrega registerEnumType
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsEnum,
} from 'class-validator';

export enum ExerciseDifficulty {
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

// 2. REGISTRA EL ENUM AQUÍ PARA GRAPHQL
registerEnumType(ExerciseDifficulty, {
  name: 'ExerciseDifficulty', // Este nombre aparecerá en tu Schema de GraphQL
  description: 'Nivel de dificultad del ejercicio', // Opcional
});

@InputType()
export class CreateExerciseInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field(() => String,{ nullable: true })
  @IsString()
  @IsOptional()
  objective: string;

  // Aquí ahora GraphQL reconocerá el tipo gracias al registro
  @Field(() => ExerciseDifficulty, { nullable: true })
  @IsEnum(ExerciseDifficulty)
  @IsOptional()
  difficulty: ExerciseDifficulty;

  @Field(() => String,{ nullable: true })
  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @Field(() => String,{ nullable: true })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}

@ObjectType()
export class ExerciseEntity {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;

  @Field(() => String, { nullable: true })
  objective?: string;

  // El error "CannotDetermineOutputTypeError" desaparece con el registro
  @Field(() => ExerciseDifficulty)
  difficulty: ExerciseDifficulty;

  @Field(() => String, { nullable: true })
  videoUrl?: string;

  @Field(() => String, { nullable: true })
  imageUrl?: string;

  @Field(() => String)
  schoolId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
