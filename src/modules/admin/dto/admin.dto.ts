// src/modules/admin/dto/admin.dto.ts
import {
  InputType,
  Field,
  Int,
  registerEnumType,
  ObjectType,
  Float,
} from '@nestjs/graphql';
import { TournamentStatus } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

// ==========================================
// ENUMS DE GRAPHQL
// ==========================================

export enum MacroEntityType {
  GOVERNMENTAL = 'GOVERNMENTAL',
  PRIVATE_LEAGUE = 'PRIVATE_LEAGUE',
}
registerEnumType(MacroEntityType, { name: 'MacroEntityType' });

registerEnumType(TournamentStatus, {
  name: 'TournamentStatus',
});
// Editado: Alineado con el enum `SchoolMode` de tu esquema Prisma
export enum SchoolMode {
  COMMERCIAL = 'COMMERCIAL',
  INSTITUTIONAL = 'INSTITUTIONAL',
}
registerEnumType(SchoolMode, { name: 'SchoolMode' });

export enum LeagueFormat {
  LARGO = 'LARGO',
  CORTO = 'CORTO',
  COPA = 'COPA',
}
registerEnumType(LeagueFormat, { name: 'LeagueFormat' });

export enum GlobalAssetType {
  PDF = 'PDF',
  VIDEO = 'VIDEO',
  TACTICAL_BOARD = 'TACTICAL_BOARD',
}
registerEnumType(GlobalAssetType, { name: 'GlobalAssetType' });

export enum TargetAudience {
  COACH = 'COACH',
  PLAYER = 'PLAYER',
  GUARDIAN = 'GUARDIAN',
}
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

@InputType()
export class CreateLeagueDto {
  @Field(() => String)
  name: string;

  @Field(() => String)
  organizerEmail: string;

  @Field(() => LeagueFormat)
  format: LeagueFormat;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description:
      'JSON con configuraciones específicas de ruedas, ascensos, etc.',
  })
  settings?: any;
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
  @Field()
  name: string;

  @Field(() => MacroEntityType)
  type: MacroEntityType;

  @Field(() => Int, { defaultValue: 0 })
  schoolsLimit: number;

  @Field({ defaultValue: true })
  isActive: boolean;

  @Field()
  adminId: string;
}

@InputType()
export class UpdatePlanLimitInput {
  @Field(() => Int, { nullable: true })
  maxStudents?: number;

  @Field(() => Int, { nullable: true })
  maxCategories?: number;

  @Field(() => Int, { nullable: true })
  maxCoaches?: number;

  @Field({ nullable: true })
  allowsStore?: boolean;

  @Field({ nullable: true })
  allowsGlobalLib?: boolean;

  @Field({ nullable: true })
  allowsFinance?: boolean;
}
