import {
  ObjectType,
  Field,
  ID,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import { SchoolEntity } from './school.entity';

// ==========================================
// 1. ENUMS (Definiciones estáticas)
// ==========================================

// Definimos el Enum para que GraphQL lo entienda
export enum ReferralStatus {
  PENDING = 'PENDING',
  CONVERTED = 'CONVERTED',
  REJECTED = 'REJECTED',
}

registerEnumType(ReferralStatus, {
  name: 'ReferralStatus',
  description: 'Estado de la invitación de referido',
});

// ==========================================
// 2. ENTIDADES (Lo que devuelve la API)
// ==========================================

@ObjectType({ description: 'Registro de una invitación entre directores' })
export class Referral {
  @Field(() => ID)
  id: string;

  @Field(() => String, {
    description: 'ID de la escuela que envió la invitación',
  })
  referrerSchoolId: string;

  @Field(() => SchoolEntity, {
    description: 'La escuela que invitó (Director A)',
  })
  referrerSchool: SchoolEntity;

  @Field(() => String, { description: 'Email invitado' })
  referredSchoolEmail: string;

  @Field(() => String, {
    nullable: true,
    description: 'ID de la escuela creada (si ya aceptó)',
  })
  referredSchoolId?: string;

  @Field(() => SchoolEntity, {
    nullable: true,
    description: 'La escuela nueva (Director B) si ya existe',
  })
  referredSchool?: SchoolEntity;

  @Field(() => ReferralStatus)
  status: ReferralStatus;

  @Field(() => Boolean, {
    description: 'Si el Director A ya recibió su mes gratis',
  })
  rewardClaimed: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType({ description: 'Banner publicitario local (Sponsor)' })
export class Sponsorship {
  @Field(() => ID)
  id: string;

  @Field(() => String, {
    description: 'Nombre del cliente (ej: Dentista San José)',
  })
  name: string;

  @Field(() => String, { description: 'URL de la imagen del banner' })
  imageUrl: string;

  @Field(() => String, {
    nullable: true,
    description: 'Link de redirección al hacer clic',
  })
  redirectUrl?: string;

  @Field(() => String, {
    description: 'Ubicación en la app (ej: APP_HOME, LOADING)',
  })
  location: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date)
  startDate: Date;

  @Field(() => Date)
  endDate: Date;

  @Field(() => String)
  schoolId: string;
}

// ==========================================
// 3. INPUTS (Lo que recibe la API para crear/editar)
// ==========================================

@InputType({ description: 'Datos para crear un nuevo patrocinio' })
export class CreateSponsorshipInput {
  @Field(() => String)
  name: string;

  @Field(() => String)
  imageUrl: string;

  @Field(() => String, { nullable: true })
  redirectUrl?: string;

  @Field(() => String, { description: 'Ej: APP_BOTTOM_BANNER' })
  location: string;

  @Field(() => Date)
  startDate: Date;

  @Field(() => Date)
  endDate: Date;
}

@InputType({ description: 'Datos para actualizar un patrocinio existente' })
export class UpdateSponsorshipInput {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  imageUrl?: string;

  @Field(() => String, { nullable: true })
  redirectUrl?: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}

@InputType({ description: 'Datos para enviar una invitación de referido' })
export class SendReferralInviteInput {
  @Field(() => String, {
    description: 'Correo electrónico del director a invitar',
  })
  email: string;
}
