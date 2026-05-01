import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TasksKanbanService } from './tasks-kanban.service';
import { Role, TaskPriority, TaskStatus } from '@prisma/client';
import { Task } from '@/entitys/tasks.entity';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
// 1. IMPORTA LA ENTIDAD (ObjectType) DE TU TAREA

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class TasksKanbanResolver {
  constructor(private taskService: TasksKanbanService) {}

  // 2. DEFINE EL TIPO DE RETORNO EN EL DECORADOR (Ej: Array de Tareas)
  @Query(() => [Task], { name: 'boardTasks' })
  @Roles(Role.DIRECTOR, Role.SUPERADMIN, Role.SUBADMIN)
  async getBoardTasks(@Args('schoolId') schoolId: string) {
    return this.taskService.getBoardTasks(schoolId);
  }

  // 3. DEFINE EL TIPO DE RETORNO EN LAS MUTATIONS (Ej: Una Tarea)
  @Mutation(() => Task, { name: 'createTask' })
  @Roles(Role.DIRECTOR, Role.SUPERADMIN, Role.SUBADMIN)
  async createTask(
    @Args('schoolId') schoolId: string,
    @Args('title') title: string,
    @Args('priority', { type: () => TaskPriority }) priority: TaskPriority,
    @Args('description', { nullable: true }) description?: string,
    @Args('assignedToUserId', { nullable: true }) assignedToUserId?: string,
    @Args('dueDate', { nullable: true }) dueDate?: Date,
  ) {
    return this.taskService.createTask({
      schoolId,
      title,
      description,
      assignedToUserId,
      dueDate,
      priority,
    });
  }

  @Mutation(() => Task, { name: 'moveTask' })
  @Roles(Role.DIRECTOR, Role.SUPERADMIN, Role.SUBADMIN)
  async moveTask(
    @Args('id') id: string,
    @Args('newStatus', { type: () => String }) newStatus: TaskStatus, // Si tienes un Enum en Prisma, a veces es mejor mapearlo o registrarlo
    @Args('newPosition', { type: () => Int }) newPosition: number,
  ) {
    return this.taskService.moveTask(id, newStatus, newPosition);
  }
}
