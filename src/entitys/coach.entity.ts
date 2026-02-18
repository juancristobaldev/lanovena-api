import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';
import { UserEntity } from './user.entity';
import { CategoryEntity } from './category.entity';

@ObjectType()
export class CoachEntity {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => UserEntity)
  user: UserEntity;

  @Field(() => String,{ nullable: true })
  bio?: string;

  // Relación con Categorías (M:N)
  @Field(() => [CategoryEntity], { nullable: true })
  categories?: CategoryEntity[];
}

// Input para actualizar perfil técnico (Bio, etc)
// Nota: Las categorías suelen asignarse por ID en una mutación aparte o input especial
@InputType()
export class UpdateCoachProfileInput {
  @Field(() => String,{ nullable: true })
  bio?: string;
}
