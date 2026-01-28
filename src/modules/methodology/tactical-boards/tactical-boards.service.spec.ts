import { Test, TestingModule } from '@nestjs/testing';
import { TacticalBoardsService } from './tactical-boards.service';

describe('TacticalBoardsService', () => {
  let service: TacticalBoardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TacticalBoardsService],
    }).compile();

    service = module.get<TacticalBoardsService>(TacticalBoardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
