import { Test, TestingModule } from '@nestjs/testing';
import { TasksKanbanService } from './tasks-kanban.service';

describe('TasksKanbanService', () => {
  let service: TasksKanbanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksKanbanService],
    }).compile();

    service = module.get<TasksKanbanService>(TasksKanbanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
