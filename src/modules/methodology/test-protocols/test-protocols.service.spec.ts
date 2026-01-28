import { Test, TestingModule } from '@nestjs/testing';
import { TestProtocolsService } from './test-protocols.service';

describe('TestProtocolsService', () => {
  let service: TestProtocolsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestProtocolsService],
    }).compile();

    service = module.get<TestProtocolsService>(TestProtocolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
