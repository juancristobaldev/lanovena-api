import {
  ObjectType,
  Field,
  ID,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import { EvaluationCategory, MeasurementUnit } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// ==========================================
// 1. ENTIDADES (Object Types para GraphQL)
// ==========================================

registerEnumType(EvaluationCategory, { name: 'EvaluationCategory' });
registerEnumType(MeasurementUnit, { name: 'MeasurementUnit' });

@ObjectType()
export class TestProtocolEntity {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => EvaluationCategory)
  category: EvaluationCategory;

  @Field(() => MeasurementUnit)
  unit: MeasurementUnit;

  @Field(() => Boolean)
  isGlobal: boolean;

  @Field(() => String, { nullable: true })
  baremoJson?: string;
}

// ==========================================
// 2. INPUTS (Datos de entrada)
// ==========================================

// --- Inputs para Tests ---
@InputType()
export class CreateTestProtocolInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  name: string; // Ej: "Yo-Yo Test Intermitente"

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  description: string; // Ej: "Correr 20 metros al ritmo del sonido..."

  @Field(() => EvaluationCategory)
  @IsEnum(EvaluationCategory)
  category: EvaluationCategory;

  @Field(() => MeasurementUnit)
  @IsEnum(MeasurementUnit)
  unit: MeasurementUnit;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean; // Si es true, lo ven todas las escuelas.

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  baremoJson?: string; // JSON con las tablas de referencia (opcional)
}

// ====================================================================
// Input para ACTUALIZAR un Protocolo de Test (Opcional pero recomendado)
// ====================================================================
@InputType()
export class UpdateTestProtocolInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => EvaluationCategory, { nullable: true })
  @IsOptional()
  @IsEnum(EvaluationCategory)
  category?: EvaluationCategory;

  @Field(() => MeasurementUnit, { nullable: true })
  @IsOptional()
  @IsEnum(MeasurementUnit)
  unit?: MeasurementUnit;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  baremoJson?: string;
}
