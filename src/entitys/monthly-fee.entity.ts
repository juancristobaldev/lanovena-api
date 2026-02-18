import {
  ObjectType,
  Field,
  ID,
  Float,
  registerEnumType,
  Int,
  InputType,
} from '@nestjs/graphql';
import { PlayerEntity } from './player.entity';
import { PaymentStatus } from '@prisma/client'; // Importamos el Enum nativo de Prisma

// Registramos el Enum para que GraphQL lo entienda
registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
  description: 'Estado del pago de la mensualidad',
});

// Enum para métodos de pago (Manual)
export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

registerEnumType(PaymentMethod, { name: 'PaymentMethod' });

@ObjectType()
export class MonthlyFeeEntity {
  @Field(() => ID)
  id: string;

  @Field(() => Float)
  amount: number;

  @Field(() => Date)
  dueDate: Date;

  @Field(() => Date,{ nullable: true })
  paymentDate?: Date;

  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Field(() => String, { nullable: true }) // Usamos String para flexibilidad o el Enum creado arriba
  paymentMethod?: string;

  @Field(() => Int)
  month: number;

  @Field(() => Int)
  year: number;

  @Field(() => String)
  schoolId: string;

  @Field(() => PlayerEntity)
  player: PlayerEntity;
}

// Objeto para los KPIs (Resumen Financiero)
@ObjectType()
export class FinanceSummary {
  @Field(() => Float)
  totalCollected: number; // Dinero en caja (PAID)

  @Field(() => Float)
  totalPending: number; // Por cobrar (PENDING)

  @Field(() => Float)
  totalOverdue: number; // Deuda vencida (OVERDUE)

  @Field(() => Float)
  expectedTotal: number; // Total teórico del mes

  @Field(() => Float)
  collectionRate: number; // % de Efectividad
}

@InputType()
export class MarkFeeAsPaidInput {
  @Field(() => ID)
  feeId: string;

  @Field(() => PaymentMethod)
  paymentMethod: PaymentMethod;
}
