import { Module } from '@nestjs/common';
import { TestProtocolsService } from './test-protocols/test-protocols.service';
import { TacticalBoardsService } from './tactical-boards/tactical-boards.service';
import { MethodologyResolver } from './methodology.resolver';

@Module({
  providers: [TestProtocolsService, TacticalBoardsService, MethodologyResolver]
})
export class MethodologyModule {}
