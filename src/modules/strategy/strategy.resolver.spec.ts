import { Test, TestingModule } from '@nestjs/testing';
import { StrategyResolver } from './strategy.resolver';

describe('StrategyResolver', () => {
  let resolver: StrategyResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StrategyResolver],
    }).compile();

    resolver = module.get<StrategyResolver>(StrategyResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
