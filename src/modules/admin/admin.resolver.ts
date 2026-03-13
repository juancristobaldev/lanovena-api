import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { AdminService } from './admin.service';

import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

import { MonthlyFeeEntity } from '@/entitys/monthly-fee.entity';
import { UserEntity } from '@/entitys/user.entity';
import {
  AdminDashboardStats,
  RevenueAnalytics,
  AdminSchoolObject,
  AdminUserObject,
  BillingOverviewObject,
  OverdueSchoolObject,
  LeagueObject,
  ReferralObject,
  SponsorshipObject,
  ExerciseObject,
  StrategyObject,
  BoardObject,
  SystemSettingObject,
  FeatureFlagObject,
  SupportTicketObject,
  PlanLimitObject,
  MacroEntityObject,
  AdminAuditLogObject,
} from './dto/admin.object';
import { CreateMacroEntityInput, UpdatePlanLimitInput } from './dto/admin.dto';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
export class AdminResolver {
  constructor(private readonly adminService: AdminService) {}

  // =====================================================
  // DASHBOARD
  // =====================================================

  @Query(() => AdminDashboardStats, { name: 'adminDashboardStats' })
  async dashboardStats(): Promise<AdminDashboardStats> {
    return this.adminService.getDashboardStats();
  }

  @Query(() => RevenueAnalytics, { name: 'adminRevenueAnalytics' })
  async revenueAnalytics(): Promise<RevenueAnalytics> {
    return this.adminService.getRevenueAnalytics();
  }

  // =====================================================
  // CLIENTES
  // =====================================================

  @Query(() => [AdminSchoolObject], { name: 'adminSchools' })
  async schools() {
    return this.adminService.getSchools();
  }

  @Mutation(() => AdminSchoolObject, { name: 'adminDeactivateSchool' })
  async deactivateSchool(@Args('schoolId') schoolId: string) {
    return this.adminService.deactivateSchool(schoolId);
  }

  @Mutation(() => AdminSchoolObject, { name: 'adminToggleKillMode' })
  async toggleKillMode(
    @Args('schoolId') schoolId: string,
    @Args('activate') activate: boolean,
  ) {
    return this.adminService.toggleKillMode(schoolId, activate);
  }

  // =====================================================
  // MACRO ENTITIES
  // =====================================================

  @Query(() => [MacroEntityObject], { name: 'adminMacroEntities' })
  async macroEntities() {
    return this.adminService.getMacroEntities();
  }

  @Mutation(() => MacroEntityObject, { name: 'adminCreateMacroEntity' })
  async createMacroEntity(@Args('data') data: CreateMacroEntityInput) {
    return this.adminService.createMacroEntity(data);
  }

  // =====================================================
  // USERS
  // =====================================================

  @Query(() => [AdminUserObject], { name: 'adminUsers' })
  async users(): Promise<AdminUserObject[]> {
    return this.adminService.getUsers();
  }

  @Mutation(() => AdminUserObject, { name: 'adminUpdateUserRole' })
  async updateUserRole(
    @Args('userId') userId: string,
    @Args('role') role: string,
  ): Promise<AdminUserObject> {
    return this.adminService.updateUserRole(userId, role);
  }

  @Mutation(() => AdminUserObject, { name: 'adminDeactivateUser' })
  async deactivateUser(
    @Args('userId') userId: string,
  ): Promise<AdminUserObject> {
    return this.adminService.deactivateUser(userId);
  }

  @Mutation(() => UserEntity, { name: 'adminImpersonateUser' })
  async impersonateUser(@Args('userId') userId: string) {
    return this.adminService.impersonateUser(userId);
  }

  // =====================================================
  // SAAS PLANS
  // =====================================================

  @Query(() => [PlanLimitObject], { name: 'adminPlanLimits' })
  async planLimits(): Promise<PlanLimitObject[]> {
    return this.adminService.getPlanLimits();
  }

  @Mutation(() => PlanLimitObject, { name: 'adminUpdatePlanLimit' })
  async updatePlanLimit(
    @Args('planType') planType: string,
    @Args('data') data: UpdatePlanLimitInput,
  ): Promise<PlanLimitObject> {
    return this.adminService.updatePlanLimit(planType, data);
  }

  // =====================================================
  // BILLING
  // =====================================================

  @Query(() => [BillingOverviewObject], { name: 'adminBillingOverview' })
  async billingOverview() {
    return this.adminService.getBillingOverview();
  }

  @Mutation(() => MonthlyFeeEntity, { name: 'adminWaiveFee' })
  async waiveFee(@Args('feeId') feeId: string) {
    return this.adminService.waiveFee(feeId);
  }

  @Query(() => [OverdueSchoolObject], { name: 'adminOverdueSchools' })
  async overdueSchools() {
    return this.adminService.overdueSchools();
  }

  // =====================================================
  // LEAGUES
  // =====================================================

  @Query(() => [LeagueObject], { name: 'adminLeagues' })
  async leagues() {
    return this.adminService.getLeagues();
  }

  @Mutation(() => LeagueObject, { name: 'adminCancelLeague' })
  async cancelLeague(@Args('leagueId') leagueId: string) {
    return this.adminService.cancelLeague(leagueId);
  }

  // =====================================================
  // REFERRALS
  // =====================================================

  @Query(() => [ReferralObject], { name: 'adminReferrals' })
  async referrals() {
    return this.adminService.getReferrals();
  }

  @Mutation(() => ReferralObject, { name: 'adminApproveReferralReward' })
  async approveReferral(@Args('referralId') referralId: string) {
    return this.adminService.approveReferralReward(referralId);
  }

  // =====================================================
  // SPONSORS
  // =====================================================

  @Query(() => [SponsorshipObject], { name: 'adminSponsorships' })
  async sponsorships() {
    return this.adminService.getSponsorships();
  }

  @Mutation(() => SponsorshipObject, { name: 'adminDeactivateSponsorship' })
  async deactivateSponsorship(@Args('id') id: string) {
    return this.adminService.deactivateSponsorship(id);
  }

  // =====================================================
  // CONTENT
  // =====================================================

  @Query(() => [ExerciseObject], { name: 'adminExercises' })
  async exercises() {
    return this.adminService.getExercises();
  }

  @Mutation(() => Boolean, { name: 'adminDeleteExercise' })
  async deleteExercise(@Args('id') id: string) {
    await this.adminService.deleteExercise(id);
    return true;
  }

  @Query(() => [StrategyObject], { name: 'adminStrategies' })
  async strategies() {
    return this.adminService.getStrategies();
  }

  @Query(() => [BoardObject], { name: 'adminBoards' })
  async boards(): Promise<BoardObject[]> {
    return this.adminService.getBoards();
  }

  // =====================================================
  // SYSTEM SETTINGS
  // =====================================================

  @Query(() => [SystemSettingObject], { name: 'adminSystemSettings' })
  async systemSettings(): Promise<SystemSettingObject[]> {
    return this.adminService.getSystemSettings();
  }

  @Mutation(() => SystemSettingObject, { name: 'adminUpdateSystemSetting' })
  async updateSystemSetting(
    @Args('key') key: string,
    @Args('value') value: string,
  ): Promise<SystemSettingObject> {
    return this.adminService.updateSystemSetting(key, value);
  }

  @Mutation(() => Boolean, { name: 'adminToggleMaintenance' })
  async toggleMaintenance(@Args('enabled') enabled: boolean) {
    await this.adminService.toggleMaintenance(enabled);
    return enabled;
  }

  // =====================================================
  // FEATURE FLAGS
  // =====================================================

  @Query(() => [FeatureFlagObject], { name: 'adminFeatureFlags' })
  async featureFlags() {
    return this.adminService.getFeatureFlags();
  }

  // =====================================================
  // SUPPORT
  // =====================================================

  @Query(() => [SupportTicketObject], { name: 'adminSupportTickets' })
  async supportTickets() {
    return this.adminService.getSupportTickets();
  }

  // =====================================================
  // SECURITY
  // =====================================================

  @Query(() => [AdminAuditLogObject], { name: 'adminAuditLogs' })
  async auditLogs(): Promise<AdminAuditLogObject[]> {
    return this.adminService.getAuditLogs();
  }
}
