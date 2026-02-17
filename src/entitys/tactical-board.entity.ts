import {
  ObjectType,
  Field,
  ID,
  Float,
  InputType,
  PartialType,
} from '@nestjs/graphql';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { GraphQLJSON } from 'graphql-type-json'; // Necesitarás: npm i graphql-type-json

@ObjectType()
export class TacticalBoardEntity {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  categoryId: string;

  // Usamos GraphQLJSON para flexibilidad total con los datos del canvas
  @Field(() => GraphQLJSON)
  initialState: any;

  @Field(() => GraphQLJSON, { nullable: true })
  animation?: any;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class CreateTacticalBoardInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => ID)
  @IsUUID()
  categoryId: string;

  @Field(() => ID)
  @IsUUID()
  coachId: string;
  // El estado actual de la pizarra (tokens + dibujos)
  @Field(() => GraphQLJSON)
  @IsNotEmpty()
  initialState: any;

  // La grabación (opcional)
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  animation?: any;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  tags?: string[];
}

@InputType()
export class UpdateTacticalBoardInput extends PartialType(
  CreateTacticalBoardInput,
) {
  @Field(() => ID)
  id: string;
}
