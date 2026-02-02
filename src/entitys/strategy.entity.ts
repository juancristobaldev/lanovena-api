import { InputType, Field, PartialType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';
import { UserEntity } from './user.entity';

@InputType()
export class CreateStrategyInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => GraphQLJSON)
  @IsNotEmpty()
  tokens: any; // Recibe el array de fichas [{id, x, y, type...}]

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  drawingData?: string; // String Base64
}

@InputType()
export class UpdateStrategyInput extends PartialType(CreateStrategyInput) {
  @Field()
  id: string;
}

@ObjectType()
export class Strategy {
  @Field(() => String)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => GraphQLJSON)
  tokens: any;

  @Field({ nullable: true })
  drawingData?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field()
  coachId: string;

  @Field(() => UserEntity)
  coach: UserEntity;
}
