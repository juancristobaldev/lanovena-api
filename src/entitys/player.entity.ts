import { ObjectType, Field, InputType, ID, PartialType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CategoryEntity } from './category.entity';
import { UserEntity } from './user.entity';

@ObjectType()
export class PlayerEntity {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => Date)
  birthDate: Date;

  @Field(() => String, { nullable: true })
  photoUrl?: string;

  @Field(() => String, { nullable: true })
  medicalInfo?: string;

  @Field(() => Boolean)
  active: boolean;

  @Field(() => Boolean)
  scholarship: boolean;

  @Field(() => String)
  qrCodeToken: string;

  @Field(() => ID)
  categoryId: string;

  @Field(() => CategoryEntity)
  category: CategoryEntity;

  @Field(() => UserEntity)
  guardian: UserEntity;
  @Field(() => ID)
  guardianId: string;
}

@InputType()
export class CreatePlayerInput {
  @Field(() => String)
  @IsString()
  firstName: string;

  @Field(() => String)
  @IsString()
  lastName: string;

  @Field(() => Date)
  @IsDate()
  birthDate: Date;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  medicalInfo?: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  scholarship?: boolean;

  @Field(() => ID)
  @IsUUID()
  categoryId: string;

  @Field(() => ID)
  @IsUUID()
  guardianId: string;
}

@InputType()
export class UpdatePlayerInput extends PartialType(CreatePlayerInput) {
  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
