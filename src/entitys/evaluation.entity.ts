import { InputType, Field, Float, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsUUID } from 'class-validator';
import { PlayerEntity } from './player.entity';

@InputType()
export class CreateEvaluationInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  type: string; // Ej: "VELOCIDAD_30M"

  @Field(() => Float)
  @IsNumber()
  value: number; // Ej: 4.5

  @Field()
  @IsNotEmpty()
  @IsString()
  unit: string; // Ej: "seg"

  @Field()
  @IsUUID()
  playerId: string;
}

@ObjectType()
export class EvaluationEntity {
  @Field(() => String)
  id: string;

  @Field()
  type: string;

  @Field(() => Float)
  value: number;

  @Field()
  unit: string;

  @Field()
  date: Date;

  @Field(() => PlayerEntity)
  player: PlayerEntity;
}
