import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';
import { AuthService } from '../auth/auth.service';
import { AdminPublicResolver } from './admin-public.resolver';
import { FlowModule } from '../flow/flow.module';

@Module({
  imports: [FlowModule],
  providers: [AdminService, AdminResolver, AdminPublicResolver, AuthService],
})
export class AdminModule {}
