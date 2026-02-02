import {
  ObjectType,
  Field,
  InputType,
  ID,
  registerEnumType,
  PartialType,
  Int,
} from '@nestjs/graphql';
import { SchoolMode, PlanType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { UserEntity } from './user.entity';

// 1. Registrar Enums para GraphQL
registerEnumType(SchoolMode, { name: 'SchoolMode' });
registerEnumType(PlanType, { name: 'PlanType' });

export enum SchoolRole {
  DIRECTOR = 'DIRECTOR',
  COACH = 'COACH',
  STAFF = 'STAFF',
}

registerEnumType(SchoolRole, {
  name: 'SchoolRole',
  description: 'Rol del usuario dentro de una escuela',
});

@ObjectType({
  description: 'Beneficio o subvención municipal (Solo Modo Institucional)',
})
export class Benefit {
  @Field(() => ID)
  id: string;

  @Field(() => String, {
    description: 'Título del beneficio (ej: Gratuidad Junaeb)',
  })
  title: string;

  @Field(() => String, {
    description: 'Descripción o requisitos (ej: 80% asistencia)',
  })
  description: string;

  @Field(() => Boolean)
  active: boolean;

  @Field(() => String)
  schoolId: string;
}

@ObjectType()
export class CountSchool {
  @Field(() => Int)
  players: number;

  @Field(() => Int)
  categories: number;

  @Field(() => Int)
  coaches: number;

  @Field(() => Int)
  guardians: number;
}

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

  @Field(() => [Benefit], {
    nullable: true,
    description: 'Lista de beneficios (Solo Modo Institucional)',
  })
  benefits?: Benefit[];

  @Field(() => CountSchool)
  _count: CountSchool;
}

// src/graphql/entities/school-staff.entity.ts

@ObjectType()
export class SchoolStaff {
  @Field(() => ID)
  id: string;

  // --- RELACIONES ---
  @Field(() => UserEntity)
  user: UserEntity;

  @Field(() => SchoolEntity)
  school: SchoolEntity;

  // --- DATA ---
  @Field(() => SchoolRole)
  role: SchoolRole;

  @Field()
  createdAt: Date;
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

@InputType({
  description: 'Input para crear un beneficio (Modo Institucional)',
})
export class CreateBenefitInput {
  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;
}

@ObjectType({
  description: 'Estado actual de uso de recursos vs Límites del Plan',
})
export class ResourceUsage {
  @Field(() => Int)
  currentPlayers: number;

  @Field(() => Int)
  maxPlayers: number;

  @Field(() => Int)
  currentCategories: number;

  @Field(() => Int)
  maxCategories: number;

  @Field(() => Boolean)
  canAddPlayer: boolean;

  @Field(() => Boolean)
  canAddCategory: boolean;
}
