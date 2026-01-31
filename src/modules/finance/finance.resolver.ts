import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Context,
  ID,
} from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role, PaymentStatus } from '@prisma/client';
import { FinanceService } from './finance.service';
import {
  MonthlyFeeEntity,
  FinanceSummary,
  MarkFeeAsPaidInput,
} from 'src/entitys/monthly-fee.entity';

@Resolver(() => MonthlyFeeEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class FinanceResolver {
  constructor(private readonly financeService: FinanceService) {}

  /* ===========================================================================
   * QUERIES (Lectura)
   * =========================================================================== */

  @Query(() => FinanceSummary)
  @Roles(Role.DIRECTOR, Role.SUPERADMIN)
  async financeSummary(
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @Args('month', { type: () => Int }) month: number,
    @Args('year', { type: () => Int }) year: number,
    @Context() context: any,
  ) {
    this.validateAccess(context.user, schoolId);
    return this.financeService.getFinancialSummary(schoolId, month, year);
  }

  @Query(() => [MonthlyFeeEntity])
  @Roles(Role.DIRECTOR, Role.SUPERADMIN)
  async monthlyFees(
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @Args('month', { type: () => Int }) month: number,
    @Args('year', { type: () => Int }) year: number,
    @Args('status', { type: () => PaymentStatus, nullable: true })
    status: PaymentStatus,
    @Context() context: any,
  ) {
    this.validateAccess(context.user, schoolId);
    return this.financeService.findAllFees(schoolId, month, year, status);
  }

  /* ===========================================================================
   * MUTATIONS (Escritura)
   * =========================================================================== */

  @Mutation(() => MonthlyFeeEntity)
  @Roles(Role.DIRECTOR, Role.SUPERADMIN)
  async markFeeAsPaid(
    @Args('input') input: MarkFeeAsPaidInput,
    @Context() context: any,
  ) {
    // Pasamos el schoolId del usuario para validación interna en el servicio
    const userSchoolId =
      context.user.role === Role.SUPERADMIN ? undefined : context.user.schoolId;
    return this.financeService.markAsPaid(
      input.feeId,
      input.paymentMethod,
      userSchoolId,
    );
  }

  /* ===========================================================================
   * HELPERS
   * =========================================================================== */

  /**
   * Valida que un Director solo vea su propia escuela.
   * El SuperAdmin puede ver cualquiera.
   */
  private validateAccess(user: any, targetSchoolId: string) {
    if (user.role === Role.SUPERADMIN) return;

    // Si el usuario tiene múltiples escuelas (user.schools), verificar si targetSchoolId está en ellas
    if (user.schools && Array.isArray(user.schools)) {
      const hasAccess = user.schools.some(
        (s: any) => s.id === targetSchoolId || s.schoolId === targetSchoolId,
      );
      if (!hasAccess)
        throw new ForbiddenException(
          'No tienes acceso a las finanzas de esta escuela',
        );
      return;
    }

    // Fallback: Si el usuario tiene una sola escuela asignada directamente
    if (user.schoolId && user.schoolId !== targetSchoolId) {
      throw new ForbiddenException(
        'No tienes acceso a las finanzas de esta escuela',
      );
    }
  }
}
