import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { FlowApiException, FlowService } from '../flow/flow.service';
import { UserEntity } from '@/entitys/user.entity';
import { MonthlyFeeEntity } from '@/entitys/monthly-fee.entity';
import { PaymentStatus, Role, TargetAudience } from '@prisma/client';
import {
  CreateGlobalAssetDto,
  CreatePlanLimitInput,
  CreateMacroEntityInput,
  GlobalAsset,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly yearlyDiscountPercent = 20;

  constructor(
    private prisma: PrismaService,
    private flowService: FlowService,
  ) {}

  // =====================================================
  // DASHBOARD / ANALYTICS
  // =====================================================

  async getDashboardStats() {
    const [
      totalPlayers,
      totalSchools,
      totalUsers,
      activeSchools,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.player.count(),
      this.prisma.school.count(),
      this.prisma.user.count(),
      this.prisma.school.count({ where: { isActive: true } }),
      this.prisma.monthlyFee.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' },
      }),
    ]);

    return {
      totalPlayers,
      totalSchools,
      totalUsers,
      activeSchools,
      totalRevenue: totalRevenue._sum.amount ?? 0,
    };
  }

  async getDirectors() {
    const directors = await this.prisma.user.findMany({
      where: { role: Role.DIRECTOR },
    });

    return directors;
  }

  async getAdminDirectors() {
    const directors = await this.prisma.user.findMany({
      where: { role: Role.DIRECTOR },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        schoolId: true,
        flowSubscriptionStatus: true,
        flowCardStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(
      directors.map(async (director) => {
        const schoolStaffRows = await this.prisma.schoolStaff.findMany({
          where: { userId: director.id, role: Role.DIRECTOR },
          select: { schoolId: true },
        });

        const schoolIds = Array.from(
          new Set([
            ...schoolStaffRows.map((row) => row.schoolId),
            ...(director.schoolId ? [director.schoolId] : []),
          ]),
        );

        const pendingPayments = schoolIds.length
          ? await this.prisma.monthlyFee.count({
              where: {
                schoolId: { in: schoolIds },
                status: PaymentStatus.PENDING,
              },
            })
          : 0;

        const pendingFlowEvents = await this.prisma.flowWebhookEvent.count({
          where: {
            directorId: director.id,
            status: 'RECEIVED',
          },
        });

        const blockers: string[] = [];
        if (!director.isActive) {
          blockers.push('Director ya desactivado');
        }
        if (
          director.flowSubscriptionStatus === 'ACTIVE' ||
          director.flowSubscriptionStatus === 'PENDING'
        ) {
          blockers.push(
            `Suscripción Flow en estado ${director.flowSubscriptionStatus}`,
          );
        }
        if (pendingPayments > 0) {
          blockers.push(`Tiene ${pendingPayments} pagos pendientes`);
        }
        if (pendingFlowEvents > 0) {
          blockers.push(`Tiene ${pendingFlowEvents} eventos de Flow sin procesar`);
        }

        return {
          ...director,
          schoolsCount: schoolIds.length,
          canDelete: blockers.length === 0,
          blockers,
        };
      }),
    );

    return result;
  }

  async deleteDirectorSafe(directorId: string) {
    const director = await this.prisma.user.findFirst({
      where: { id: directorId, role: Role.DIRECTOR },
      select: {
        id: true,
        email: true,
        isActive: true,
        schoolId: true,
        flowCustomerId: true,
        flowSubscriptionId: true,
        flowSubscriptionStatus: true,
      },
    });

    if (!director) {
      throw new NotFoundException('Director no encontrado');
    }

    if (!director.isActive) {
      throw new BadRequestException('El director ya está desactivado');
    }

    const schoolStaffRows = await this.prisma.schoolStaff.findMany({
      where: { userId: director.id, role: Role.DIRECTOR },
      select: { schoolId: true },
    });

    const schoolIds = Array.from(
      new Set([
        ...schoolStaffRows.map((row) => row.schoolId),
        ...(director.schoolId ? [director.schoolId] : []),
      ]),
    );

    const pendingPayments = schoolIds.length
      ? await this.prisma.monthlyFee.count({
          where: {
            schoolId: { in: schoolIds },
            status: PaymentStatus.PENDING,
          },
        })
      : 0;

    if (pendingPayments > 0) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${pendingPayments} pagos pendientes`,
      );
    }

    if (
      director.flowSubscriptionStatus === 'ACTIVE' ||
      director.flowSubscriptionStatus === 'PENDING'
    ) {
      throw new ConflictException(
        `No se puede eliminar: suscripción Flow en estado ${director.flowSubscriptionStatus}`,
      );
    }

    const pendingFlowEvents = await this.prisma.flowWebhookEvent.count({
      where: {
        directorId: director.id,
        status: 'RECEIVED',
      },
    });

    if (pendingFlowEvents > 0) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${pendingFlowEvents} eventos Flow pendientes`,
      );
    }

    if (director.flowSubscriptionId) {
      try {
        await this.flowService.cancelSubscription(director.flowSubscriptionId);
      } catch (error: any) {
        this.logger.error(
          `No se pudo cancelar suscripción ${director.flowSubscriptionId}: ${error.message}`,
        );
        throw new ConflictException(
          'No se pudo cancelar la suscripción en Flow. Eliminación cancelada por seguridad',
        );
      }
    }

    const hasLegacyExternalId = director.flowCustomerId?.startsWith('director_');

    if (director.flowCustomerId && !hasLegacyExternalId) {
      try {
        await this.flowService.deleteCustomer(director.flowCustomerId);
      } catch (error: any) {
        const isNotIdentifiedError =
          error instanceof FlowApiException &&
          String(error.flowCode) === '501' &&
          error.flowMessage
            ?.toLowerCase()
            .includes('customer has not been identified');

        if (isNotIdentifiedError) {
          this.logger.warn(
            `Flow customer ${director.flowCustomerId} no identificado en delete; se continúa con soft delete local`,
          );
        } else {
          throw new ConflictException(
            'No se pudo eliminar el cliente en Flow. Eliminación cancelada por seguridad',
          );
        }
      }
    } else if (hasLegacyExternalId) {
      this.logger.warn(
        `Se omite /customer/delete para ID legacy ${director.flowCustomerId}`,
      );
    }

    const [localPart, domainPart] = director.email.split('@');
    const emailAlias = `${localPart}+deleted_${Date.now()}_${director.id.slice(0, 8)}@${domainPart || 'deleted.local'}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.schoolStaff.deleteMany({
        where: { userId: director.id },
      });

      await tx.user.update({
        where: { id: director.id },
        data: {
          isActive: false,
          email: emailAlias,
          schoolId: null,
          flowCustomerId: null,
          flowSubscriptionId: null,
          flowPlanId: null,
          flowSubscriptionStatus: null,
          flowCardStatus: null,
          flowCardLast4: null,
          flowCardType: null,
          flowLastPaymentStatus: null,
          flowLastToken: null,
          flowCurrentPeriodEnd: null,
          flowNextBillingDate: null,
        },
      });
    });

    return {
      success: true,
      message: 'Director eliminado de forma segura',
    };
  }

  async getGlobalAssets(): Promise<{
    coaches: GlobalAsset[];
    players: GlobalAsset[];
    guardians: GlobalAsset[];
  }> {
    try {
      const globalAsset = await this.prisma.globalAsset.findMany();

      const coaches = globalAsset.filter(
        (g) => g.targetAudience === TargetAudience.COACH,
      );
      const guardians = globalAsset.filter(
        (g) => g.targetAudience === TargetAudience.GUARDIAN,
      );
      const players = globalAsset.filter(
        (g) => g.targetAudience === TargetAudience.PLAYER,
      );

      return { coaches, players, guardians };
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException(e);
    }
  }
  async createGlobalAssets(input: CreateGlobalAssetDto) {
    try {
      const globalAsset = await this.prisma.globalAsset.create({
        data: input,
      });

      return globalAsset;
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException(e);
    }
  }

  async deleteGlobalAsset(id: string) {
    try {
      await this.prisma.globalAsset.delete({
        where: {
          id,
        },
      });

      return true;
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException(e);
    }
  }

  async getRevenueAnalytics() {
    const fees = await this.prisma.monthlyFee.findMany({
      where: { status: 'PAID' },
    });

    const revenue = fees.reduce((acc, f) => acc + f.amount, 0);

    return {
      totalRevenue: revenue,
      totalPayments: fees.length,
    };
  }

  async getStatisticsKpis(range = '30days') {
    const now = new Date();
    const start = new Date(now);

    if (range === 'year') {
      start.setMonth(now.getMonth() - 11, 1);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'quarter') {
      start.setMonth(now.getMonth() - 2, 1);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }

    const [
      totalSchools,
      activeSchools,
      users,
      players,
      weekUsers,
      weekPlayers,
    ] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({ where: { isActive: true } }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.player.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
          },
        },
        select: { createdAt: true },
      }),
      this.prisma.player.findMany({
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
          },
        },
        select: { createdAt: true },
      }),
    ]);

    const conversionRate =
      totalSchools > 0 ? (activeSchools / totalSchools) * 100 : 0;

    const trend = this.buildTrend(range, start, now, users, players);
    const weeklyActivity = this.buildWeeklyActivity(weekUsers, weekPlayers);

    return {
      conversion: {
        totalSchools,
        activeSchools,
        conversionRate,
      },
      trend,
      weeklyActivity,
    };
  }

  private buildTrend(
    range: string,
    start: Date,
    now: Date,
    users: { createdAt: Date }[],
    players: { createdAt: Date }[],
  ) {
    const monthLabel = (date: Date) =>
      date.toLocaleDateString('es-CL', { month: 'short' });

    if (range === '30days') {
      const labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'];
      const buckets = labels.map((label, index) => {
        const bucketStart = new Date(start);
        bucketStart.setDate(start.getDate() + index * 7);

        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(bucketStart.getDate() + 6);

        return {
          label,
          start: bucketStart,
          end: index === labels.length - 1 ? now : bucketEnd,
        };
      });

      return buckets.map((bucket) => ({
        label: bucket.label,
        users: users.filter(
          (u) => u.createdAt >= bucket.start && u.createdAt <= bucket.end,
        ).length,
        players: players.filter(
          (p) => p.createdAt >= bucket.start && p.createdAt <= bucket.end,
        ).length,
      }));
    }

    const months = range === 'year' ? 12 : 3;
    const buckets = Array.from({ length: months }).map((_, index) => {
      const date = new Date(start);
      date.setMonth(start.getMonth() + index);

      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      return {
        label: monthLabel(monthStart),
        start: monthStart,
        end: monthEnd,
      };
    });

    return buckets.map((bucket) => ({
      label: bucket.label,
      users: users.filter(
        (u) => u.createdAt >= bucket.start && u.createdAt <= bucket.end,
      ).length,
      players: players.filter(
        (p) => p.createdAt >= bucket.start && p.createdAt <= bucket.end,
      ).length,
    }));
  }

  private buildWeeklyActivity(
    users: { createdAt: Date }[],
    players: { createdAt: Date }[],
  ) {
    const labels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const dayMap: Record<string, number> = {
      Lun: 1,
      Mar: 2,
      Mie: 3,
      Jue: 4,
      Vie: 5,
      Sab: 6,
      Dom: 0,
    };

    const counts = labels.map((label) => {
      const day = dayMap[label];
      const usersCount = users.filter(
        (u) => u.createdAt.getDay() === day,
      ).length;
      const playersCount = players.filter(
        (p) => p.createdAt.getDay() === day,
      ).length;
      return {
        label,
        value: usersCount + playersCount,
      };
    });

    return counts;
  }

  // =====================================================
  // CLIENTES
  // =====================================================

  async getSchools() {
    const countCoach = await this.prisma.user.count({
      where: {
        role: Role.COACH,
      },
    });

    return this.prisma.school
      .findMany({
        include: {
          _count: {
            select: {
              players: true,
              users: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((data) =>
        data.map((school) => ({
          ...school,
          _count: {
            ...school._count,
            coaches: countCoach,
          },
        })),
      );
  }

  async deactivateSchool(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) throw new NotFoundException('School not found');

    return this.prisma.school.update({
      where: { id: schoolId },
      data: { isActive: false },
    });
  }

  async toggleKillMode(schoolId: string, activate: boolean) {
    return this.prisma.school.update({
      where: { id: schoolId },
      data: { isActive: !activate },
    });
  }

  // =====================================================
  // MACRO ENTITIES
  // =====================================================

  async getMacroEntities() {
    return this.prisma.macroEntity.findMany({
      include: {
        admin: {
          include: {
            schools: true,
          },
        },
      },
    });
  }
  async create(input: CreateMacroEntityInput) {
    try {
      // 1. Verificar si el correo ya está en uso en toda la plataforma
      const existingUser = await this.prisma.user.findUnique({
        where: { email: input.adminEmail },
      });

      if (existingUser) {
        throw new ConflictException(
          'El correo electrónico ya está registrado.',
        );
      }

      // 2. Encriptar la contraseña (salting de 10 rondas es el estándar)
      const hashedPassword = await bcrypt.hash(input.adminPassword, 10);

      // 3. Crear la MacroEntidad y el SubAdmin en una sola transacción
      const newMacroEntity = await this.prisma.macroEntity.create({
        data: {
          name: input.entityName,
          type: input.entityType,
          schoolsLimit: input.schoolsLimit,
          admin: {
            create: {
              fullName: input.adminFullName,
              email: input.adminEmail,
              password: hashedPassword,
              role: Role.SUBADMIN, // Forzamos el rol por regla de negocio
            },
          },
        },
        // Opcional: Incluir el admin en la respuesta si tu frontend lo necesita de inmediato
        include: {
          admin: {
            include: {
              schools: true,
            },
          },
        },
      });

      return newMacroEntity;
    } catch (error: any) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(
        'Error al crear la macro entidad: ' + error.message,
      );
    }
  }

  // =====================================================
  // USUARIOS
  // =====================================================

  async getUsers() {
    return this.prisma.user.findMany({
      include: {
        school: true,
      },
    });
  }

  async updateUserRole(userId: string, role: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async deactivateUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async impersonateUser(userId: string): Promise<UserEntity> {
    const user: any = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException();

    return user;
  }

  // =====================================================
  // SAAS PLANS
  // =====================================================

  async getPlanLimits() {
    return this.prisma.planLimit.findMany({
      orderBy: [{ name: 'asc' }],
    });
  }

  async getPublicPlanCatalog() {
    return this.prisma.planLimit.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
    });
  }

  private buildFlowPlanId(name: string, suffix: 'm' | 'y') {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 28);
    return `${base || 'plan'}_${suffix}_${Date.now()}`;
  }

  async createPlanLimit(input: CreatePlanLimitInput) {
    if (input.amount === 0 && (input.isActive ?? true)) {
      const activeFree = await this.prisma.planLimit.findFirst({
        where: { amount: 0, isActive: true },
        select: { id: true },
      });

      if (activeFree) {
        throw new BadRequestException('Ya existe un plan free activo');
      }
    }

    if (input.amount === 0) {
      return this.prisma.planLimit.create({
        data: {
          name: input.name,
          amount: 0,
          isActive: input.isActive ?? true,
          interval: 'BOTH',
          flowId: null,
          flowIdYearly: null,
          maxSchools: input.maxSchools,
          maxPlayersPerSchool: input.maxPlayersPerSchool,
          maxCategories: input.maxCategories,
          maxGuardianPerPlayer: input.maxGuardianPerPlayer,
        },
      });
    }

    const yearlyAmount = Math.round(
      input.amount * 12 * (1 - this.yearlyDiscountPercent / 100),
    );

    const created = await this.prisma.planLimit.create({
      data: {
        name: input.name,
        amount: input.amount,
        isActive: false,
        interval: 'BOTH',
        maxSchools: input.maxSchools,
        maxPlayersPerSchool: input.maxPlayersPerSchool,
        maxCategories: input.maxCategories,
        maxGuardianPerPlayer: input.maxGuardianPerPlayer,
      },
    });

    const monthlyFlowPlanId = this.buildFlowPlanId(input.name, 'm');
    const yearlyFlowPlanId = this.buildFlowPlanId(input.name, 'y');

    try {
      await this.flowService.createPlan({
        planId: monthlyFlowPlanId,
        name: `${input.name} Mensual`,
        amount: input.amount,
        interval: 3,
      });

      await this.flowService.createPlan({
        planId: yearlyFlowPlanId,
        name: `${input.name} Anual`,
        amount: yearlyAmount,
        interval: 4,
      });

      return this.prisma.planLimit.update({
        where: { id: created.id },
        data: {
          flowId: monthlyFlowPlanId,
          flowIdYearly: yearlyFlowPlanId,
          isActive: input.isActive ?? true,
        },
      });
    } catch (error: any) {
      try {
        await this.flowService.deletePlan(monthlyFlowPlanId);
      } catch {}
      try {
        await this.flowService.deletePlan(yearlyFlowPlanId);
      } catch {}

      await this.prisma.planLimit.delete({ where: { id: created.id } });

      throw new BadRequestException(
        `No se pudo crear plan en Flow y se hizo rollback: ${error?.message || 'error desconocido'}`,
      );
    }
  }

  async updatePlanLimit(planLimitId: string, data: any) {
    const current = await this.prisma.planLimit.findUnique({
      where: { id: planLimitId },
    });

    if (!current) {
      throw new NotFoundException('Plan no encontrado');
    }

    const nextAmount = data.amount ?? current.amount;
    const nextIsActive = data.isActive ?? current.isActive;

    if (nextAmount === 0 && nextIsActive) {
      const activeFree = await this.prisma.planLimit.findFirst({
        where: {
          amount: 0,
          isActive: true,
          id: { not: planLimitId },
        },
        select: { id: true },
      });

      if (activeFree) {
        throw new BadRequestException('Ya existe un plan free activo');
      }
    }

    if (nextAmount === 0) {
      if (current.flowId) {
        try {
          await this.flowService.deletePlan(current.flowId);
        } catch {}
      }

      if (current.flowIdYearly) {
        try {
          await this.flowService.deletePlan(current.flowIdYearly);
        } catch {}
      }

      return this.prisma.planLimit.update({
        where: { id: planLimitId },
        data: {
          ...data,
          amount: 0,
          flowId: null,
          flowIdYearly: null,
        },
      });
    }

    return this.prisma.planLimit.update({
      where: { id: planLimitId },
      data,
    });
  }

  async deactivatePlanLimit(planLimitId: string) {
    const plan = await this.prisma.planLimit.findUnique({
      where: { id: planLimitId },
    });

    if (!plan) throw new NotFoundException('Plan no encontrado');

    return this.prisma.planLimit.update({
      where: { id: planLimitId },
      data: { isActive: false },
    });
  }

  async deletePlanLimit(planLimitId: string) {
    const plan = await this.prisma.planLimit.findUnique({
      where: { id: planLimitId },
    });

    if (!plan) throw new NotFoundException('Plan no encontrado');

    const flowPlanIds = [plan.flowId, plan.flowIdYearly].filter(
      Boolean,
    ) as string[];

    const activeSubscriptions =
      flowPlanIds.length > 0
        ? await this.prisma.user.count({
            where: {
              flowSubscriptionStatus: 'ACTIVE',
              flowPlanId: { in: flowPlanIds },
            },
          })
        : 0;

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        'Este plan tiene suscripciones activas en Flow. Solo se puede desactivar.',
      );
    }

    if (plan.flowId) {
      await this.flowService.deletePlan(plan.flowId);
    }

    if (plan.flowIdYearly) {
      await this.flowService.deletePlan(plan.flowIdYearly);
    }

    await this.prisma.planLimit.delete({ where: { id: planLimitId } });
    return true;
  }

  // =====================================================
  // BILLING
  // =====================================================

  async getBillingOverview() {
    return this.prisma.monthlyFee.findMany({
      include: {
        player: true,
        school: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async waiveFee(feeId: string): Promise<MonthlyFeeEntity> {
    const monthlyFee: any = this.prisma.monthlyFee.update({
      where: { id: feeId },
      data: {
        status: 'WAIVED',
      },
    });

    return monthlyFee;
  }

  async overdueSchools() {
    return this.prisma.monthlyFee.findMany({
      where: { status: 'OVERDUE' },
      include: { school: true },
    });
  }

  // =====================================================
  // LEAGUES
  // =====================================================

  // =====================================================
  // REFERRALS
  // =====================================================

  async getReferrals() {
    return this.prisma.referral.findMany({
      include: {
        referrerSchool: true,
        referredSchool: true,
      },
    });
  }

  async approveReferralReward(referralId: string) {
    return this.prisma.referral.update({
      where: { id: referralId },
      data: {
        rewardClaimed: true,
        status: 'CONVERTED',
      },
    });
  }

  // =====================================================
  // SPONSORSHIPS
  // =====================================================

  async getSponsorships() {
    return this.prisma.sponsorship.findMany({
      include: { school: true },
    });
  }

  async deactivateSponsorship(id: string) {
    return this.prisma.sponsorship.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // =====================================================
  // CONTENT MODERATION
  // =====================================================

  async getExercises() {
    return this.prisma.exercise.findMany({
      include: { school: true },
    });
  }

  async deleteExercise(id: string) {
    return this.prisma.exercise.delete({
      where: { id },
    });
  }

  async getStrategies() {
    return this.prisma.strategy.findMany({
      include: { coach: true },
    });
  }

  async getBoards() {
    return this.prisma.tacticalBoard.findMany({
      include: { coach: true },
    });
  }

  // =====================================================
  // SYSTEM SETTINGS
  // =====================================================

  async getSystemSettings() {
    return this.prisma.systemSetting.findMany();
  }

  async updateSystemSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async toggleMaintenance(enabled: boolean) {
    return this.updateSystemSetting(
      'MAINTENANCE_MODE',
      enabled ? 'true' : 'false',
    );
  }

  // =====================================================
  // FEATURE FLAGS
  // =====================================================

  async getFeatureFlags() {
    return this.prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: 'FEATURE_',
        },
      },
    });
  }

  // =====================================================
  // SUPPORT
  // =====================================================

  async getSupportTickets() {
    return this.prisma.supportTicket.findMany({
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =====================================================
  // SECURITY
  // =====================================================

  async getAuditLogs() {
    return this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async logAdminAction(data: any) {
    return this.prisma.adminAuditLog.create({
      data,
    });
  }
}
