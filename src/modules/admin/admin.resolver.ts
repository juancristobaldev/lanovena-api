import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
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
  AdminDashboardHistoryPoint,
  AdminStatisticsKpis,
  AdminSchoolObject,
  AdminUserObject,
  BillingOverviewObject,
  OverdueSchoolObject,
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
  AdminDirectorObject,
  AdminSafeDeleteResultObject,
  AdminCrmDirectorObject,
  AdminSalesKpisObject,
  AdminSubscriptionSaleObject,
} from './dto/admin.object';
import {
  CreatePlanLimitInput,
  CreateGlobalAssetDto,
  CreateMacroEntityInput,
  GlobalAsset,
  GlobalAssetOutput,
  UpdatePlanLimitInput,
} from './dto/admin.dto';
import { RegisterInput } from '@/entitys/auth.entity';
import { AuthService } from '../auth/auth.service';
import { Role } from '@prisma/client';
import { TournamentService } from '../tournament/tournament.service';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
export class AdminResolver {
  constructor(
    private readonly adminService: AdminService,
    private readonly authServices: AuthService,
  ) {}

  // =====================================================
  // DASHBOARD
  // =====================================================

  @Query(() => [UserEntity], { name: 'GetDirectors' })
  async GetDirectors() {
    return this.adminService.getDirectors();
  }

  @Query(() => [AdminDirectorObject], { name: 'adminDirectors' })
  async adminDirectors() {
    return this.adminService.getAdminDirectors();
  }

  @Query(() => AdminDashboardStats, { name: 'adminDashboardStats' })
  async dashboardStats(): Promise<AdminDashboardStats> {
    return this.adminService.getDashboardStats();
  }

  @Query(() => RevenueAnalytics, { name: 'adminRevenueAnalytics' })
  async revenueAnalytics(): Promise<RevenueAnalytics> {
    return this.adminService.getRevenueAnalytics();
  }

  @Query(() => [AdminDashboardHistoryPoint], { name: 'adminDashboardHistory' })
  async dashboardHistory(
    @Args('months', { type: () => Int, nullable: true }) months?: number,
  ): Promise<AdminDashboardHistoryPoint[]> {
    return this.adminService.getDashboardHistory(months);
  }

  @Query(() => [AdminCrmDirectorObject], { name: 'adminCrmDirectors' })
  async adminCrmDirectors() {
    return this.adminService.getCrmDirectors();
  }

  @Query(() => AdminSalesKpisObject, { name: 'adminSalesKpis' })
  async adminSalesKpis() {
    return this.adminService.getSalesKpis();
  }

  @Query(() => [AdminSubscriptionSaleObject], { name: 'adminSubscriptionSales' })
  async adminSubscriptionSales() {
    return this.adminService.getSubscriptionSales();
  }

  @Query(() => AdminStatisticsKpis, { name: 'adminStatisticsKpis' })
  async statisticsKpis(
    @Args('range', { type: () => String, nullable: true }) range?: string,
  ): Promise<AdminStatisticsKpis> {
    return this.adminService.getStatisticsKpis(range);
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
  async createMacroEntity(@Args('input') input: CreateMacroEntityInput) {
    return this.adminService.create(input);
  }

  @Mutation(() => UserEntity, { name: 'createSuperAdmin' })
  async createSuperAdmin(@Args('input') input: RegisterInput) {
    return this.authServices.register(input, Role.SUPERADMIN);
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

  @Mutation(() => AdminSafeDeleteResultObject, { name: 'adminDeleteDirectorSafe' })
  async deleteDirectorSafe(@Args('directorId') directorId: string) {
    return this.adminService.deleteDirectorSafe(directorId);
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
    @Args('planLimitId') planLimitId: string,
    @Args('data') data: UpdatePlanLimitInput,
  ): Promise<PlanLimitObject> {
    return this.adminService.updatePlanLimit(planLimitId, data);
  }

  @Mutation(() => PlanLimitObject, { name: 'adminCreatePlanLimit' })
  async createPlanLimit(
    @Args('input') input: CreatePlanLimitInput,
  ): Promise<PlanLimitObject> {
    return this.adminService.createPlanLimit(input);
  }

  @Mutation(() => PlanLimitObject, { name: 'adminDeactivatePlanLimit' })
  async deactivatePlanLimit(
    @Args('planLimitId') planLimitId: string,
  ): Promise<PlanLimitObject> {
    return this.adminService.deactivatePlanLimit(planLimitId);
  }

  @Mutation(() => Boolean, { name: 'adminDeletePlanLimit' })
  async deletePlanLimit(@Args('planLimitId') planLimitId: string) {
    return this.adminService.deletePlanLimit(planLimitId);
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

  @Query(() => GlobalAssetOutput, { name: 'getGlobalAssets' })
  async getGlobalAssets() {
    const globalAsset = await this.adminService.getGlobalAssets();
    return globalAsset;
  }

  @Mutation(() => GlobalAsset, { name: 'createGlobalAssets' })
  async createGlobalAssets(@Args('input') input: CreateGlobalAssetDto) {
    const globalAsset = await this.adminService.createGlobalAssets(input);
    return globalAsset;
  }

  @Mutation(() => Boolean, { name: 'deleteGlobalAssets' })
  async deleteGlobalAssets(@Args('id') id: string) {
    const globalAsset = await this.adminService.deleteGlobalAsset(id);
    return globalAsset;
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
