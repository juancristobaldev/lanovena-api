import { Test, TestingModule } from '@nestjs/testing';
import { GlobalNewsService } from './global-news.service';

describe('GlobalNewsService', () => {
  let service: GlobalNewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalNewsService],
    }).compile();

    service = module.get<GlobalNewsService>(GlobalNewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
