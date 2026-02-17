import { Test, TestingModule } from '@nestjs/testing';
import { TacticalBoardService } from './tactical-board.service';

describe('TacticalBoardService', () => {
  let service: TacticalBoardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TacticalBoardService],
    }).compile();

    service = module.get<TacticalBoardService>(TacticalBoardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
