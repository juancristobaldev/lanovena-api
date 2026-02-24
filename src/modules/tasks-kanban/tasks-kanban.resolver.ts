import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TasksKanbanService } from './tasks-kanban.service';
import { TaskStatus } from '@prisma/client';
import { Task } from '@/entitys/tasks.entity';
// 1. IMPORTA LA ENTIDAD (ObjectType) DE TU TAREA

@Resolver()
export class TasksKanbanResolver {
  constructor(private taskService: TasksKanbanService) {}

  // 2. DEFINE EL TIPO DE RETORNO EN EL DECORADOR (Ej: Array de Tareas)
  @Query(() => [Task], { name: 'boardTasks' })
  async getBoardTasks(@Args('schoolId') schoolId: string) {
    return this.taskService.getBoardTasks(schoolId);
  }

  // 3. DEFINE EL TIPO DE RETORNO EN LAS MUTATIONS (Ej: Una Tarea)
  @Mutation(() => Task, { name: 'createTask' })
  async createTask(
    @Args('schoolId') schoolId: string,
    @Args('title') title: string,
    @Args('description', { nullable: true }) description?: string,
    @Args('assignedToUserId', { nullable: true }) assignedToUserId?: string,
  ) {
    return this.taskService.createTask({
      schoolId,
      title,
      description,
      assignedToUserId,
    });
  }

  @Mutation(() => Task, { name: 'moveTask' })
  async moveTask(
    @Args('id') id: string,
    @Args('newStatus', { type: () => String }) newStatus: TaskStatus, // Si tienes un Enum en Prisma, a veces es mejor mapearlo o registrarlo
    @Args('newPosition', { type: () => Int }) newPosition: number,
  ) {
    return this.taskService.moveTask(id, newStatus, newPosition);
  }
}
