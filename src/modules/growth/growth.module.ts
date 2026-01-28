import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals/referrals.service';
import { SponsorshipService } from './sponsorship/sponsorship.service';
import { GrowthResolver } from './growth.resolver';

@Module({
  providers: [ReferralsService, SponsorshipService, GrowthResolver]
})
export class GrowthModule {}
