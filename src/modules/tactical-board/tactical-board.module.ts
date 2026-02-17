import { Module } from '@nestjs/common';
import { TacticalBoardService } from './tactical-board.service';
import { TacticalBoardResolver } from './tactical-board.resolver';

@Module({
  providers: [TacticalBoardService, TacticalBoardResolver]
})
export class TacticalBoardModule {}
