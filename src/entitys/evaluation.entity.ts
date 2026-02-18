import { InputType, Field, Float, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsUUID } from 'class-validator';
import { PlayerEntity } from './player.entity';

@InputType()
export class CreateEvaluationInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  type: string; // Ej: "VELOCIDAD_30M"

  @Field(() => Float)
  @IsNumber()
  value: number; // Ej: 4.5

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  unit: string; // Ej: "seg"

  @Field(() => String)
  @IsUUID()
  playerId: string;
}

@ObjectType()
export class EvaluationEntity {
  @Field(() => String)
  id: string;

  @Field(() => String)
  type: string;

  @Field(() => Float)
  value: number;

  @Field(() => String)
  unit: string;

  @Field(() => Date)
  date: Date;

  @Field(() => PlayerEntity)
  player: PlayerEntity;
}
