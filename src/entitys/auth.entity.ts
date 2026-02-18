import { ObjectType, Field, InputType, Int } from '@nestjs/graphql';
import { UserEntity } from './user.entity';

@ObjectType()
export class AuthResponse {
  @Field(() => String, {
    description: 'Token JWT para acceder a los endpoints protegidos',
  })
  accessToken: string;

  @Field(() => UserEntity, { description: 'Datos del usuario autenticado' })
  user: UserEntity;
}

@InputType()
export class LoginInput {
  @Field(() => String)
  email: string;

  @Field(() => String)
  password: string;
}

@InputType()
export class RegisterInput {
  @Field(() => String)
  email: string;

  @Field(() => String)
  password: string;

  @Field(() => String)
  fullName: string;

  @Field(() => String,{ nullable: true })
  phone?: string;
}

@InputType()
export class OnboardingStepInput {
  @Field(() => Int, {
    description: 'El paso del wizard que acaba de completar (1-4)',
  })
  step: number;
}
