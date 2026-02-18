import { InputType, Field, PartialType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';
import { UserEntity } from './user.entity';

@InputType()
export class CreateStrategyInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  title: string;

  @Field(() => String,{ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => GraphQLJSON)
  @IsNotEmpty()
  tokens: any; // Recibe el array de fichas [{id, x, y, type...}]

  @Field(() => String,{ nullable: true })
  @IsOptional()
  @IsString()
  drawingData?: string; // String Base64
}

@InputType()
export class UpdateStrategyInput extends PartialType(CreateStrategyInput) {
  @Field(() => String)
  id: string;
}

@ObjectType()
export class Strategy {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String,{ nullable: true })
  description?: string;

  @Field(() => GraphQLJSON)
  tokens: any;

  @Field(() => String,{ nullable: true })
  drawingData?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => String)
  coachId: string;

  @Field(() => UserEntity)
  coach: UserEntity;
}
