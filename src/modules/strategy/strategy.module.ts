import { Module } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { StrategyResolver } from './strategy.resolver';

@Module({
  providers: [StrategyService, StrategyResolver]
})
export class StrategyModule {}
