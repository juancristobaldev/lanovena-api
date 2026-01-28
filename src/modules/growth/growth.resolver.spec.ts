import { Test, TestingModule } from '@nestjs/testing';
import { GrowthResolver } from './growth.resolver';

describe('GrowthResolver', () => {
  let resolver: GrowthResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GrowthResolver],
    }).compile();

    resolver = module.get<GrowthResolver>(GrowthResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
