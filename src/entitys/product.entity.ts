// products/entities/product.entity.ts
import {
  ObjectType,
  Field,
  ID,
  Float,
  Int,
  InputType,
  PartialType,
} from '@nestjs/graphql';
import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
} from 'class-validator';

@ObjectType()
export class ProductEntity {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Float)
  price: number;

  @Field(() => Int, { description: 'Cantidad disponible en inventario' })
  stock: number;

  @Field(() => String, { nullable: true })
  imageUrl?: string;

  @Field(() => Boolean)
  active: boolean;

  @Field(() => ID)
  schoolId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class CreateProductInput {
  @Field(() => String)
  @IsString()
  name: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  price: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  stock: number;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @Field(() => ID)
  @IsUUID()
  schoolId: string;
}

@InputType()
export class UpdateProductInput extends PartialType(CreateProductInput) {
  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
