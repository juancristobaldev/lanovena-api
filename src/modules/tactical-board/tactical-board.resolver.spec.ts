import { Test, TestingModule } from '@nestjs/testing';
import { TacticalBoardResolver } from './tactical-board.resolver';

describe('TacticalBoardResolver', () => {
  let resolver: TacticalBoardResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TacticalBoardResolver],
    }).compile();

    resolver = module.get<TacticalBoardResolver>(TacticalBoardResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
