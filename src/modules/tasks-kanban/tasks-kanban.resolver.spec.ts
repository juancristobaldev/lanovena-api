import { Test, TestingModule } from '@nestjs/testing';
import { TasksKanbanResolver } from './tasks-kanban.resolver';

describe('TasksKanbanResolver', () => {
  let resolver: TasksKanbanResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksKanbanResolver],
    }).compile();

    resolver = module.get<TasksKanbanResolver>(TasksKanbanResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
