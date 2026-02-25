import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationsResolver } from './evaluations.resolver';

describe('EvaluationsResolver', () => {
  let resolver: EvaluationsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvaluationsResolver],
    }).compile();

    resolver = module.get<EvaluationsResolver>(EvaluationsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
