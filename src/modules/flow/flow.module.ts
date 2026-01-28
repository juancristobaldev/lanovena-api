import { Module } from '@nestjs/common';
import { FlowService } from './flow.service';
import { SubscriptionController } from './subscriptions/subscriptions.controller';
import { FlowController } from './flow.controller';

@Module({
  providers: [FlowService],
  controllers: [SubscriptionController, FlowController],
})
export class FlowModule {}
