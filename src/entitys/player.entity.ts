import {
  ObjectType,
  Field,
  InputType,
  ID,
  PartialType,
  registerEnumType,
  Float,
} from '@nestjs/graphql';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CategoryEntity } from './category.entity';
import { UserEntity } from './user.entity';
import { PaymentStatus } from '@prisma/client';
import { SchoolEntity } from './school.entity';

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
});

// 1. Definimos el Enum para saber qué tipo de evento es
export enum EventType {
  MATCH = 'MATCH',
  TRAINING = 'TRAINING',
}

// Registramos el Enum para que GraphQL lo reconozca
registerEnumType(EventType, {
  name: 'EventType',
  description: 'Tipo de evento próximo: Partido o Entrenamiento',
});

@ObjectType()
export class NextEvent {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string; // Ej: "vs Colo Colo" o "Entrenamiento Táctico"

  @Field(() => Date)
  date: Date;

  @Field(() => EventType)
  type: EventType;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => Boolean)
  isCitado: boolean; // Si el jugador está convocado
}

@ObjectType()
export class PlayerStats {
  @Field(() => Float)
  attendanceRate: number; // Porcentaje 0-100

  @Field(() => Date, { nullable: true })
  lastAttendance?: Date;
}

@ObjectType()
export class PlayerFinancialStatus {
  @Field(() => PaymentStatus)
  status: PaymentStatus; // PAID, PENDING, OVERDUE, WAIVED

  @Field(() => Float)
  debtAmount: number;

  @Field(() => Date, { nullable: true })
  lastPaymentDate?: Date;
}

@ObjectType()
export class PlayerEntity {
  @Field(() => String)
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

  @Field(() => SchoolEntity, { nullable: true })
  school?: SchoolEntity;

  @Field(() => ID)
  schoolId: string;

  @Field(() => CategoryEntity, { nullable: true })
  category?: CategoryEntity;

  @Field(() => UserEntity, { nullable: true })
  guardian?: UserEntity;
  @Field(() => String)
  guardianId: string;

  @Field(() => PlayerStats, { nullable: true })
  stats?: PlayerStats;

  @Field(() => PlayerFinancialStatus, { nullable: true })
  financialStatus?: PlayerFinancialStatus;

  @Field(() => NextEvent, { nullable: true })
  nextEvent?: NextEvent;
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
  schoolId: string;

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
