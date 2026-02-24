import { Test, TestingModule } from '@nestjs/testing';
import { NoticesResolver } from './notices.resolver';

describe('NoticesResolver', () => {
  let resolver: NoticesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NoticesResolver],
    }).compile();

    resolver = module.get<NoticesResolver>(NoticesResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
