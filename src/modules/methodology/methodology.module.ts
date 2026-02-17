import { Module } from '@nestjs/common';
import { TestProtocolsService } from './test-protocols/test-protocols.service';
import { MethodologyResolver } from './methodology.resolver';

@Module({
  providers: [TestProtocolsService, MethodologyResolver],
})
export class MethodologyModule {}
