import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ReferralsService } from './referrals/referrals.service';
import { SponsorshipsService } from './sponsorship/sponsorship.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import {
  CreateSponsorshipInput,
  Referral,
  Sponsorship,
} from '../../entitys/growth.entity';

@Resolver()
export class GrowthResolver {
  constructor(
    private readonly referralsService: ReferralsService,
    private readonly sponsorshipsService: SponsorshipsService,
  ) {}
  @Mutation(() => Referral)
  async sendInvite(@CurrentUser() user: User, @Args('email') email: string) {
    // Asumimos que el usuario tiene un schoolId (validar roles si es necesario)

    if (user.schoolId === null) return;
    return this.referralsService.createInvite(user.schoolId, email);
  }

  @Query(() => [Referral])
  async myReferrals(@CurrentUser() user: User) {
    if (user.schoolId === null) return;

    return this.referralsService.findMyReferrals(user.schoolId);
  }

  @Mutation(() => Sponsorship)
  async createSponsorship(
    @CurrentUser() user: User,
    @Args('input') input: CreateSponsorshipInput,
  ) {
    if (user.schoolId === null) return;

    return this.sponsorshipsService.create(user.schoolId, input);
  }

  @Query(() => [Sponsorship])
  async activeBanners(
    @CurrentUser() user: User,
    @Args('location') location: string,
  ) {
    if (user.schoolId === null) return;

    return this.sponsorshipsService.findActiveByLocation(
      user.schoolId,
      location,
    );
  }

  @Query(() => [Sponsorship])
  async allSponsorships(@CurrentUser() user: User) {
    if (user.schoolId === null) return;

    return this.sponsorshipsService.findAllBySchool(user.schoolId);
  }
}
