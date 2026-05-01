// src/modules/admin/dto/admin.dto.ts
import { RegisterInput } from '@/entitys/auth.entity';
import {
  InputType,
  Field,
  Int,
  registerEnumType,
  ObjectType,
  Float,
} from '@nestjs/graphql';
import {
  GlobalAssetType,
  TargetAudience,
  TournamentStatus,
} from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

// ==========================================
// ENUMS DE GRAPHQL
// ==========================================

export enum MacroEntityType {
  GOVERNMENTAL = 'GOVERNMENTAL',
  PRIVATE_LEAGUE = 'PRIVATE_LEAGUE',
}
registerEnumType(MacroEntityType, { name: 'MacroEntityType' });

// Editado: Alineado con el enum `SchoolMode` de tu esquema Prisma
export enum SchoolMode {
  COMMERCIAL = 'COMMERCIAL',
  INSTITUTIONAL = 'INSTITUTIONAL',
}
registerEnumType(SchoolMode, { name: 'SchoolMode' });

registerEnumType(GlobalAssetType, { name: 'GlobalAssetType' });
registerEnumType(TargetAudience, { name: 'TargetAudience' });

// ==========================================
// INPUT TYPES (DTOs)
// ==========================================

@InputType()
export class CreateMacroEntityDto {
  @Field(() => String)
  name: string;

  @Field(() => String)
  adminEmail: string;

  @Field(() => Int)
  schoolsLimit: number;

  @Field(() => MacroEntityType)
  type: MacroEntityType;
}

@InputType()
export class CreateSchoolClientDto {
  @Field(() => String)
  name: string;

  @Field(() => String)
  directorEmail: string;

  // Editado: Cambiado de operationMode a mode para que coincida con Prisma
  @Field(() => SchoolMode)
  mode: SchoolMode;

  @Field(() => String, { nullable: true })
  macroEntityId?: string;
}

@ObjectType()
export class GlobalAsset {
  @Field(() => String)
  id: string;
  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => GlobalAssetType)
  type: GlobalAssetType;

  @Field(() => TargetAudience)
  targetAudience: TargetAudience;

  @Field(() => String)
  url: string;
  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class GlobalAssetOutput {
  @Field(() => [GlobalAsset])
  coaches: GlobalAsset[];
  @Field(() => [GlobalAsset]) guardians: GlobalAsset[];

  @Field(() => [GlobalAsset]) players?: GlobalAsset[];
}

@InputType()
export class CreateGlobalAssetDto {
  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;

  @Field(() => GlobalAssetType)
  type: GlobalAssetType;

  @Field(() => TargetAudience)
  targetAudience: TargetAudience;

  @Field(() => String)
  url: string;
  @Field(() => Boolean)
  isActive: boolean;
}

@ObjectType()
export class AdminDashboardStats {
  @Field(() => Int)
  totalPlayers: number;

  @Field(() => Int)
  totalSchools: number;

  @Field(() => Float)
  projectedMRR: number;

  @Field(() => Int)
  droppedSubscriptions: number;
}

@InputType()
export class CreateMacroEntityInput {
  // --- Datos de la Entidad ---
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la entidad es obligatorio' })
  entityName: string;

  @Field(() => String) // Si registraste el Enum en GQL, usa: @Field(() => MacroEntityType)
  @IsNotEmpty()
  entityType: MacroEntityType;

  @Field(() => Int)
  @IsNumber()
  @Min(1, { message: 'El límite debe ser al menos 1 escuela' })
  schoolsLimit: number;

  // --- Datos del SubAdmin ---
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'El nombre del administrador es obligatorio' })
  adminFullName: string;

  @Field()
  @IsEmail({}, { message: 'Debe ser un correo válido' })
  adminEmail: string;

  @Field()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  adminPassword: string;
}

@InputType()
export class UpdatePlanLimitInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSchools?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPlayersPerSchool?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCategories?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxGuardianPerPlayer?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class CreatePlanLimitInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  amount: number;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  maxSchools: number;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  maxPlayersPerSchool: number;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  maxCategories: number;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  maxGuardianPerPlayer: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
