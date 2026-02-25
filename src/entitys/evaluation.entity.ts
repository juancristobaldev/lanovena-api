import { InputType, Field, Float, ObjectType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsNumber,
  IsUUID,
  IsOptional,
  IsString,
} from 'class-validator';
import { PlayerEntity } from './player.entity';
import { TestProtocolEntity } from './methodology.entity';

@InputType()
export class CreateEvaluationInput {
  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  protocolId: string; // ✅ Ahora solo pasamos el ID del protocolo

  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @Field(() => Float)
  @IsNumber()
  value: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field(() => String)
  @IsUUID()
  playerId: string;
}

@ObjectType()
export class EvaluationEntity {
  @Field(() => String)
  id: string;

  @Field(() => Float)
  value: number;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => Date)
  date: Date;

  @Field(() => TestProtocolEntity)
  protocol: TestProtocolEntity; // ✅ Devuelve los detalles del Test (Nombre, Unidad, Categoría)

  @Field(() => PlayerEntity)
  player: PlayerEntity;
}
