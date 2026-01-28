import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';

// ==========================================
// 1. ENTIDADES (Object Types para GraphQL)
// ==========================================

@ObjectType({
  description: 'Protocolo estandarizado de evaluación física/técnica',
})
export class TestProtocol {
  @Field(() => ID)
  id: string;

  @Field(() => String, {
    description: 'Nombre del test (Ej: Yo-Yo Recovery L1)',
  })
  name: string;

  @Field(() => String, { description: 'Instrucciones de ejecución' })
  description: string;

  @Field(() => String, {
    description: 'Unidad de medida (cm, seg, repeticiones)',
  })
  unit: string;

  @Field(() => Boolean, {
    description: 'Si es visible para todas las escuelas',
  })
  isGlobal: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'JSON String con tablas de baremos (edad vs nota)',
  })
  baremoJson?: string;
}

@ObjectType({
  description: 'Pizarra táctica digital guardada por un entrenador',
})
export class TacticalBoard {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String, {
    description: 'JSON String con las coordenadas de jugadores y líneas',
  })
  configurationJson: string;

  @Field(() => String, {
    nullable: true,
    description: 'Imagen de fondo (URL o tipo de cancha)',
  })
  backgroundImage?: string;

  @Field(() => String)
  coachId: string;

  @Field(() => String, {
    nullable: true,
    description: 'ID de la sesión asociada (si aplica)',
  })
  sessionId?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

// ==========================================
// 2. INPUTS (Datos de entrada)
// ==========================================

// --- Inputs para Tests ---
@InputType({ description: 'Datos para crear un nuevo protocolo de test' })
export class CreateTestProtocolInput {
  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => String)
  unit: string;

  @Field(() => String, { nullable: true })
  baremoJson?: string;
}

// --- Inputs para Pizarras ---
@InputType({ description: 'Datos para guardar una pizarra táctica' })
export class CreateTacticalBoardInput {
  @Field(() => String)
  title: string;

  @Field(() => String, {
    description: 'JSON stringificado con el estado del canvas',
  })
  configurationJson: string;

  @Field(() => String, { nullable: true })
  backgroundImage?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Opcional: vincular a una sesión de entrenamiento',
  })
  sessionId?: string;
}

@InputType({ description: 'Datos para actualizar una pizarra existente' })
export class UpdateTacticalBoardInput {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  configurationJson?: string;
}
