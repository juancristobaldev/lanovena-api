import { Module } from '@nestjs/common';
import { TrainingSessionsService } from './training-sessions.service';
import { TrainingSessionsResolver } from './training-sessions.resolver';

@Module({
  providers: [TrainingSessionsService, TrainingSessionsResolver]
})
export class TrainingSessionsModule {}
