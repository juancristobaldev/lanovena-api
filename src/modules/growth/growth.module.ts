import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals/referrals.service';
import { GrowthResolver } from './growth.resolver';
import { SponsorshipsService } from './sponsorship/sponsorship.service';

@Module({
  providers: [ReferralsService, SponsorshipsService, GrowthResolver],
})
export class GrowthModule {}
