import { ObjectType, Field, ID, InputType, PartialType } from '@nestjs/graphql';
import { CategoryEntity } from './category.entity';
import { MatchStatEntity } from './match-stats.entity';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

@ObjectType()
export class MatchEntity {
  @Field(() => ID)
  id: string;

  @Field()
  rivalName: string;

  @Field()
  date: Date;

  @Field()
  isHome: boolean;

  @Field({ nullable: true })
  location?: string;

  @Field()
  categoryId: string;

  @Field({ nullable: true })
  notes?: string;

  // RELACIONES

  @Field(() => CategoryEntity)
  category: CategoryEntity;

  @Field(() => [MatchStatEntity], { nullable: true })
  stats?: MatchStatEntity[];
}

@InputType()
export class CreateMatchInput {
  @Field(() => Date)
  @IsDate()
  date: Date; // Fecha y Hora del partido

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  rivalName: string; // Ej: "Colo-Colo Sub 12"

  @Field(() => Boolean, { defaultValue: true })
  @IsBoolean()
  isHome: boolean; // true = Local, false = Visita

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  location?: string; // Ej: "Cancha 2, Complejo La Novena"

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  notes?: string; // Ej: "Llevar uniforme alternativo"

  @Field(() => String, {
    nullable: true,
    description: 'Estado inicial del partido (SCHEDULED, PLAYED, etc)',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @Field(() => ID)
  @IsUUID()
  categoryId: string; // ID del equipo/categoría que jugará
}

@InputType()
export class UpdateMatchInput extends PartialType(CreateMatchInput) {
  @Field(() => ID)
  @IsUUID()
  id: string; // El ID es obligatorio para saber qué partido actualizar
}
