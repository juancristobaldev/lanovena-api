import { Module } from '@nestjs/common';
import { NoticesService } from './notices.service';
import { NoticesResolver } from './notices.resolver';

@Module({
  providers: [NoticesService, NoticesResolver]
})
export class NoticesModule {}
