import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import {
  Field,
  ObjectType,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import { TargetAudience, ViaNotice } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

// ================= ENUMS =================

registerEnumType(ViaNotice, {
  name: 'ViaNotice',
});

// ================= OBJECT =================

@ObjectType()
export class GlobalNotice {
  @Field(() => String)
  id: string;
  @Field(() => String)
  title: string;
  @Field(() => TargetAudience, { nullable: true })
  targetAudience?: TargetAudience;

  @Field(() => String)
  description: string;

  @Field(() => ViaNotice)
  via: ViaNotice;

  @Field(() => Date, { nullable: true })
  createdAt?: Date;
}

// ================= INPUTS =================

@InputType()
export class CreateGlobalNoticeInput {
  @Field(() => TargetAudience, { nullable: true })
  @IsOptional()
  @IsEnum(TargetAudience)
  targetAudience?: TargetAudience;

  @Field(() => String)
  @IsString()
  title: string;

  @Field(() => String)
  @IsString()
  description: string;

  @Field(() => ViaNotice)
  @IsEnum(ViaNotice)
  via: ViaNotice;
}

@InputType()
export class UpdateGlobalNoticeInput {
  @Field(() => String)
  @IsString()
  id: string;

  @Field(() => String)
  @IsString()
  title: string;

  @Field(() => TargetAudience, { nullable: true })
  @IsOptional()
  @IsEnum(TargetAudience)
  targetAudience?: TargetAudience;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => ViaNotice, { nullable: true })
  @IsOptional()
  @IsEnum(ViaNotice)
  via?: ViaNotice;
}
