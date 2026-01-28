import { Test, TestingModule } from '@nestjs/testing';
import { MethodologyResolver } from './methodology.resolver';

describe('MethodologyResolver', () => {
  let resolver: MethodologyResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MethodologyResolver],
    }).compile();

    resolver = module.get<MethodologyResolver>(MethodologyResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
