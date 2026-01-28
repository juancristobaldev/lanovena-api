import { Test, TestingModule } from '@nestjs/testing';
import { TrainingSessionsResolver } from './training-sessions.resolver';

describe('TrainingSessionsResolver', () => {
  let resolver: TrainingSessionsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrainingSessionsResolver],
    }).compile();

    resolver = module.get<TrainingSessionsResolver>(TrainingSessionsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
