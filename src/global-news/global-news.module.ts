import { Module } from '@nestjs/common';
import { GlobalNewsService } from './global-news.service';
import { GlobalNewsResolver } from './global-news.resolver';

@Module({
  providers: [GlobalNewsService, GlobalNewsResolver]
})
export class GlobalNewsModule {}
