import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from '@/entitys/user.entity';
import { MonthlyFeeEntity } from '@/entitys/monthly-fee.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

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

  // =====================================================
  // CLIENTES
  // =====================================================

  async getSchools() {
    return this.prisma.school.findMany({
      include: {
        macroEntity: true,
        _count: {
          select: {
            players: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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
        admin: true,
        schools: true,
      },
    });
  }

  async createMacroEntity(data: any) {
    const admin = await this.prisma.user.findUnique({
      where: { email: data.adminEmail },
    });

    if (!admin) {
      throw new BadRequestException('Admin user not found');
    }

    return this.prisma.macroEntity.create({
      data: {
        name: data.name,
        type: data.type,
        schoolsLimit: data.schoolsLimit,
        adminId: admin.id,
      },
    });
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
    return this.prisma.planLimit.findMany();
  }

  async updatePlanLimit(planType: any, data: any) {
    return this.prisma.planLimit.update({
      where: { planType },
      data,
    });
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

  async getLeagues() {
    return this.prisma.tournament.findMany({
      include: {
        organizer: true,
      },
    });
  }

  async cancelLeague(leagueId: string) {
    return this.prisma.tournament.update({
      where: { id: leagueId },
      data: { status: 'CANCELLED' },
    });
  }

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
    return this.prisma.notice.findMany({
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
