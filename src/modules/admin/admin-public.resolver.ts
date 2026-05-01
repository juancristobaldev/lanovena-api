import { Query, Resolver } from '@nestjs/graphql';
import { AdminService } from './admin.service';
import { PlanLimitObject } from './dto/admin.object';

@Resolver()
export class AdminPublicResolver {
  constructor(private readonly adminService: AdminService) {}

  @Query(() => [PlanLimitObject], { name: 'publicPlanCatalog' })
  async publicPlanCatalog(): Promise<PlanLimitObject[]> {
    return this.adminService.getPublicPlanCatalog();
  }
}
