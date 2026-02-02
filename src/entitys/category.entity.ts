import {
  ObjectType,
  Field,
  ID,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import { CategoryType } from '@prisma/client';
import { TrainingSessionEntity } from './training-session.entity';
import { MatchEntity } from './match.entity';
import { PlayerEntity } from './player.entity';

// Registramos el Enum de Prisma para que GraphQL lo reconozca
registerEnumType(CategoryType, {
  name: 'CategoryType',
  description: 'Tipo de categoría: FORMATIVA o SELECTIVA',
});

@ObjectType()
export class CategoryEntity {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => CategoryType)
  type: CategoryType;
  @Field(() => [PlayerEntity])
  players: PlayerEntity[];
  @Field()
  schoolId: string;

  @Field(() => [TrainingSessionEntity], { nullable: true })
  sessions?: TrainingSessionEntity;

  @Field(() => [MatchEntity], { nullable: true })
  matches?: MatchEntity[];
}

@InputType()
export class CreateCategoryInput {
  @Field()
  name: string;

  @Field(() => CategoryType, { defaultValue: CategoryType.FORMATIVA })
  type: CategoryType;

  @Field()
  schoolId: string;

  // No pedimos schoolId aquí, lo sacamos del usuario logueado por seguridad
}

@InputType()
export class UpdateCategoryInput {
  @Field({ nullable: true })
  name?: string;

  @Field(() => CategoryType, { nullable: true })
  type?: CategoryType;
}
