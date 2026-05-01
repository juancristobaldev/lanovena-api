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
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role, PaymentStatus } from '@prisma/client';
import { FinanceService } from './finance.service';
import {
  MonthlyFeeEntity,
  FinanceSummary,
  MarkFeeAsPaidInput,
} from '../../entitys/monthly-fee.entity';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Resolver(() => MonthlyFeeEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class FinanceResolver {
  constructor(
    private readonly financeService: FinanceService,
    private readonly prisma: PrismaService,
  ) {}

  /* ===========================================================================
   * QUERIES (Lectura)
   * =========================================================================== */

  @Query(() => FinanceSummary)
  @Roles(Role.DIRECTOR, Role.SUPERADMIN, Role.SUBADMIN)
  async financeSummary(
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @Args('month', { type: () => Int }) month: number,
    @Args('year', { type: () => Int }) year: number,
    @CurrentUser() user: any,
  ) {
    await this.validateAccess(user, schoolId);
    return this.financeService.getFinancialSummary(schoolId, month, year);
  }

  @Query(() => [MonthlyFeeEntity])
  @Roles(Role.DIRECTOR, Role.SUPERADMIN, Role.SUBADMIN)
  async monthlyFees(
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @Args('month', { type: () => Int }) month: number,
    @Args('year', { type: () => Int }) year: number,
    @Args('status', { type: () => PaymentStatus, nullable: true })
    status: PaymentStatus,
    @CurrentUser() user: any,
  ) {
    await this.validateAccess(user, schoolId);
    return this.financeService.findAllFees(schoolId, month, year, status);
  }

  /* ===========================================================================
   * MUTATIONS (Escritura)
   * =========================================================================== */

  @Mutation(() => MonthlyFeeEntity)
  @Roles(Role.DIRECTOR, Role.SUPERADMIN, Role.SUBADMIN)
  async markFeeAsPaid(
    @Args('input') input: MarkFeeAsPaidInput,
    @CurrentUser() user: any,
  ) {
    // Pasamos el schoolId del usuario para validación interna en el servicio
    const userSchoolId =
      user.role === Role.SUPERADMIN ? undefined : user.schoolId;
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
  private async validateAccess(user: any, targetSchoolId: string) {
    if (user.role === Role.SUPERADMIN) return;

    if (user.role === Role.SUBADMIN) {
      const school = await this.prisma.school.findFirst({
        where: {
          id: targetSchoolId,
          macroEntity: {
            adminId: user.id,
          },
        },
      });

      if (!school) {
        throw new ForbiddenException(
          'No tienes acceso a las finanzas de esta escuela',
        );
      }
      return;
    }

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
