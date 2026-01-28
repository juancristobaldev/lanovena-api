import {
  ObjectType,
  Field,
  InputType,
  ID,
  Int,
  Float,
  registerEnumType,
  PartialType,
} from '@nestjs/graphql';
import { PaymentStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUrl,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

registerEnumType(PaymentStatus, { name: 'PaymentStatus' });

@ObjectType()
export class MonthlyFeeEntity {
  @Field(() => ID)
  id: string;

  @Field(() => Int, { description: 'Mes numérico (1-12)' })
  month: number;

  @Field(() => Int)
  year: number;

  @Field(() => Float)
  amount: number;

  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Field(() => Date)
  dueDate: Date;

  @Field(() => Date, { nullable: true })
  paidAt?: Date;

  @Field(() => String, { nullable: true })
  receiptUrl?: string;

  @Field(() => ID)
  playerId: string;
}

@InputType()
export class CreateMonthlyFeeInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @Field(() => Int)
  @IsInt()
  year: number;

  @Field(() => Float)
  @IsNumber()
  amount: number;

  @Field(() => ID)
  @IsUUID()
  playerId: string;
}

@InputType()
export class UpdateMonthlyFeeInput extends PartialType(CreateMonthlyFeeInput) {
  @Field(() => PaymentStatus, { nullable: true })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @Field(() => String, { nullable: true })
  @IsUrl()
  @IsOptional()
  receiptUrl?: string;
}
