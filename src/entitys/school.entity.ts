import {
  ObjectType,
  Field,
  InputType,
  ID,
  registerEnumType,
  PartialType,
} from '@nestjs/graphql';
import { SchoolMode, PlanType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

// 1. Registrar Enums para GraphQL
registerEnumType(SchoolMode, { name: 'SchoolMode' });
registerEnumType(PlanType, { name: 'PlanType' });

@ObjectType()
export class SchoolEntity {
  @Field(() => ID)
  id: string;

  @Field(() => String, { description: 'Nombre oficial de la escuela' })
  name: string;

  @Field(() => String, { description: 'Identificador único para la URL' })
  slug: string;

  @Field(() => SchoolMode, { defaultValue: SchoolMode.COMMERCIAL })
  mode: SchoolMode;

  @Field(() => PlanType, { defaultValue: PlanType.SEMILLERO })
  planType: PlanType;

  @Field(() => String)
  subscriptionStatus: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Datos bancarios para transferencias',
  })
  bankDetails?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class CreateSchoolInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => String, {
    description: 'Sin espacios, solo letras, números y guiones',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe ser formato URL (ej: mi-escuela)',
  })
  slug: string;

  @Field(() => SchoolMode, {
    nullable: true,
    defaultValue: SchoolMode.COMMERCIAL,
  })
  @IsEnum(SchoolMode)
  @IsOptional()
  mode?: SchoolMode;

  @Field(() => String)
  subscriptionStatus: string;

  @Field(() => PlanType, { nullable: true, defaultValue: PlanType.SEMILLERO })
  @IsEnum(PlanType)
  @IsOptional()
  planType?: PlanType;
}

@InputType()
export class UpdateSchoolInput extends PartialType(CreateSchoolInput) {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  bankDetails?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}
