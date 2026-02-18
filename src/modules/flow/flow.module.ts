import { Module } from '@nestjs/common';
import { FlowService } from './flow.service';
import { SubscriptionController } from './subscriptions/subscriptions.controller';
import { FlowController } from './flow.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule], // ConfigModule no longer required here

  providers: [FlowService],
  controllers: [SubscriptionController, FlowController],
})
export class FlowModule {}
