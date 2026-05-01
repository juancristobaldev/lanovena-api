import { Test, TestingModule } from '@nestjs/testing';
import { GlobalNewsResolver } from './global-news.resolver';

describe('GlobalNewsResolver', () => {
  let resolver: GlobalNewsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalNewsResolver],
    }).compile();

    resolver = module.get<GlobalNewsResolver>(GlobalNewsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
