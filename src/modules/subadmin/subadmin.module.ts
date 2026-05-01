import { Module } from '@nestjs/common';
import { SubadminResolver } from './subadmin.resolver';
import { SubadminService } from './subadmin.service';

@Module({
  providers: [SubadminResolver, SubadminService],
})
export class SubadminModule {}
