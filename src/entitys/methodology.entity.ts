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
