import {
  ObjectType,
  Field,
  InputType,
  ID,
  registerEnumType,
  PartialType,
} from '@nestjs/graphql';
import { Role } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { SchoolEntity, SchoolStaff } from './school.entity';

// Registrar Enum Role
registerEnumType(Role, { name: 'UserRole' }); // "Role" a veces da conflicto, mejor UserRole

@ObjectType()
export class UserEntity {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  email: string;

  // No ponemos @Field en password para que GraphQL NUNCA lo exponga
  password: string;

  @Field(() => String)
  fullName: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => Role)
  role: Role;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => ID, { nullable: true })
  schoolId?: string;

  @Field(() => [SchoolEntity], { nullable: true })
  school?: SchoolEntity[];

  @Field(() => [SchoolStaff], { nullable: true })
  schools?: SchoolStaff[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@InputType()
export class CreateUserInput {
  @Field(() => String)
  @IsEmail()
  email: string;

  @Field(() => String, { description: 'Mínimo 6 caracteres' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @Field(() => String)
  @IsString()
  fullName: string;

  @Field(() => Role, { defaultValue: Role.GUARDIAN })
  @IsEnum(Role)
  role: Role;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  schoolId?: string;
}

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
