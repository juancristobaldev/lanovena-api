import { Resolver, Mutation, Query, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { MonthlyFeeEntity } from 'src/entitys/monthly-fee.entity';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Resolver(() => MonthlyFeeEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class FinanceResolver {
  constructor(private readonly financeService: FinanceService) {}

  /* ===========================================================================
   * MUTATIONS (ADMINISTRACIÓN)
   * =========================================================================== */

  @Roles(Role.DIRECTOR)
  @Mutation(() => MonthlyFeeEntity)
  createMonthlyFee(
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('amount') amount: number,
    @Args('month') month: number,
    @Args('year') year: number,
    @Args('dueDate') dueDate: Date,
    @Context() context: any,
  ) {
    return this.financeService.createMonthlyFee(
      playerId,
      amount,
      month,
      year,
      dueDate,
      context.user,
    );
  }

  @Roles(Role.DIRECTOR)
  @Mutation(() => MonthlyFeeEntity)
  markFeeAsPaid(
    @Args('feeId', { type: () => ID }) feeId: string,
    @Args('receiptUrl', { nullable: true }) receiptUrl: string,
    @Context() context: any,
  ) {
    return this.financeService.markAsPaid(feeId, receiptUrl, context.user);
  }

  @Roles(Role.DIRECTOR)
  @Mutation(() => MonthlyFeeEntity)
  waiveMonthlyFee(
    @Args('feeId', { type: () => ID }) feeId: string,
    @Context() context: any,
  ) {
    return this.financeService.waiveFee(feeId, context.user);
  }

  /* ===========================================================================
   * QUERIES
   * =========================================================================== */

  @Roles(Role.GUARDIAN)
  @Query(() => [MonthlyFeeEntity])
  monthlyFeesByPlayer(
    @Args('playerId', { type: () => ID }) playerId: string,
    @Context() context: any,
  ) {
    return this.financeService.feesByPlayer(playerId, context.user);
  }

  @Roles(Role.DIRECTOR)
  @Query(() => [MonthlyFeeEntity])
  monthlyFeesBySchool(@Context() context: any) {
    return this.financeService.feesBySchool(context.user.schoolId);
  }
}
