import { Module } from '@nestjs/common';
import { TasksKanbanService } from './tasks-kanban.service';
import { TasksKanbanResolver } from './tasks-kanban.resolver';

@Module({
  providers: [TasksKanbanService, TasksKanbanResolver],
})
export class TasksKanbanModule {}
