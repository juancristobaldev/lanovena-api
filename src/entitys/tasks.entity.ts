import {
  ObjectType,
  Field,
  ID,
  Int,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import { TaskPriority, TaskStatus } from '@prisma/client';

// ==========================================
// 1. ENUMS (Deben registrarse en GraphQL)
// ==========================================

registerEnumType(TaskStatus, {
  name: 'TaskStatus',
  description: 'Estado de la tarea en el tablero Kanban',
});

registerEnumType(TaskPriority, {
  name: 'TaskPriority',
  description: 'Nivel de urgencia de la tarea',
});

// ==========================================
// 2. ENTIDAD PRINCIPAL (ObjectType)
// ==========================================
@ObjectType({ description: 'Entidad de Tarea para el Kanban del Staff' })
export class Task {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  // Error corregido: De description?: string; a string | null
  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => TaskStatus)
  status: TaskStatus;

  @Field(() => TaskPriority)
  priority: TaskPriority;

  @Field(() => Int, { description: 'Índice visual para el Drag & Drop' })
  position: number;

  // Error corregido: De dueDate?: Date; a Date | null
  @Field(() => Date, { nullable: true })
  dueDate?: Date | null;

  @Field()
  schoolId: string;

  // Error corregido: De assignedToUserId?: string; a string | null
  @Field(() => String, { nullable: true })
  assignedToUserId?: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

// ==========================================
// 3. INPUTS (DTOs para Mutaciones)
// ==========================================

@InputType({ description: 'Datos requeridos para crear una nueva tarea' })
export class CreateTaskInput {
  @Field()
  schoolId: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  assignedToUserId?: string;

  @Field(() => TaskPriority, { nullable: true })
  priority?: TaskPriority;

  @Field({ nullable: true })
  dueDate?: Date;
}

@InputType({
  description: 'Datos para editar los detalles completos de una tarea',
})
export class UpdateTaskInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  assignedToUserId?: string;

  @Field(() => TaskPriority, { nullable: true })
  priority?: TaskPriority;

  @Field({ nullable: true })
  dueDate?: Date;
}

@InputType({
  description: 'Payload optimizado para el evento Drag & Drop del Kanban',
})
export class MoveTaskInput {
  @Field(() => ID)
  id: string;

  @Field(() => TaskStatus, { description: 'Columna de destino' })
  newStatus: TaskStatus;

  @Field(() => Int, { description: 'Nuevo índice calculado en el frontend' })
  newPosition: number;
}
