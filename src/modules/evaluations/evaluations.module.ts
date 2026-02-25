import { Module } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { EvaluationsResolver } from './evaluations.resolver';

@Module({
  providers: [EvaluationsService, EvaluationsResolver]
})
export class EvaluationsModule {}
