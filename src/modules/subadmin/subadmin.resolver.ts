import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import {
  CreateManagedDirectorInput,
  CreateManagedSchoolInput,
  CreateShipmentInput,
  CreateSubadminGlobalNoticeInput,
  CreateSubadminTaskInput,
  DirectorAssignmentResult,
  ManagedSchoolDirectory,
  SubadminFinanceOverview,
  SubadminGlobalNoticeRecord,
  SubadminDashboardStats,
  SubadminIntelligenceOverview,
  SubadminInventoryOverview,
  SubadminMoveTaskInput,
  SubadminOperationsOverview,
  SubadminRadarSchool,
  SubadminSchoolDirectoryItem,
  SubadminSportsOverview,
  SubadminStaffPerformance,
} from '@/entitys/subadmin.entity';
import { SchoolEntity } from '@/entitys/school.entity';
import { Task } from '@/entitys/tasks.entity';
import { UserEntity } from '@/entitys/user.entity';
import { SubadminService } from './subadmin.service';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Role.SUBADMIN)
export class SubadminResolver {
  constructor(private readonly subadminService: SubadminService) {}

  @Query(() => SubadminDashboardStats, { name: 'subadminDashboardStats' })
  async dashboardStats(@CurrentUser() user: UserEntity) {
    return this.subadminService.getDashboardStats(user.id);
  }

  @Query(() => [ManagedSchoolDirectory], { name: 'subadminSchools' })
  async schools(@CurrentUser() user: UserEntity) {
    return this.subadminService.getManagedSchools(user.id);
  }

  @Query(() => SubadminIntelligenceOverview, {
    name: 'subadminIntelligenceOverview',
  })
  async intelligenceOverview(@CurrentUser() user: UserEntity) {
    return this.subadminService.getIntelligenceOverview(user.id);
  }

  @Query(() => [SubadminRadarSchool], { name: 'subadminRadarSchools' })
  async radarSchools(@CurrentUser() user: UserEntity) {
    return this.subadminService.getRadarSchools(user.id);
  }

  @Query(() => [SubadminSchoolDirectoryItem], { name: 'subadminSchoolDirectory' })
  async schoolDirectory(@CurrentUser() user: UserEntity) {
    return this.subadminService.getSchoolDirectory(user.id);
  }

  @Query(() => [SubadminStaffPerformance], { name: 'subadminStaffPerformance' })
  async staffPerformance(@CurrentUser() user: UserEntity) {
    return this.subadminService.getStaffPerformance(user.id);
  }

  @Query(() => SubadminFinanceOverview, { name: 'subadminFinanceOverview' })
  async financeOverview(
    @CurrentUser() user: UserEntity,
    @Args('month', { type: () => Int }) month: number,
    @Args('year', { type: () => Int }) year: number,
  ) {
    return this.subadminService.getFinanceOverview(user.id, month, year);
  }

  @Query(() => SubadminOperationsOverview, { name: 'subadminOperationsOverview' })
  async operationsOverview(
    @CurrentUser() user: UserEntity,
    @Args('schoolId', { type: () => ID, nullable: true }) schoolId?: string,
  ) {
    return this.subadminService.getOperationsOverview(user.id, schoolId);
  }

  @Query(() => SubadminSportsOverview, { name: 'subadminSportsOverview' })
  async sportsOverview(@CurrentUser() user: UserEntity) {
    return this.subadminService.getSportsOverview(user.id);
  }

  @Query(() => SubadminInventoryOverview, { name: 'subadminInventoryOverview' })
  async inventoryOverview(@CurrentUser() user: UserEntity) {
    return this.subadminService.getInventoryOverview(user.id);
  }

  @Query(() => [SubadminGlobalNoticeRecord], { name: 'subadminGlobalNotices' })
  async globalNotices(@CurrentUser() user: UserEntity) {
    return this.subadminService.getGlobalNoticeHistory(user.id);
  }

  @Mutation(() => SchoolEntity, { name: 'subadminCreateSchool' })
  async createSchool(
    @CurrentUser() user: UserEntity,
    @Args('input') input: CreateManagedSchoolInput,
  ) {
    return this.subadminService.createManagedSchool(user.id, input);
  }

  @Mutation(() => UserEntity, { name: 'subadminCreateDirector' })
  async createDirector(
    @CurrentUser() user: UserEntity,
    @Args('input') input: CreateManagedDirectorInput,
  ) {
    return this.subadminService.createDirector(user.id, input);
  }

  @Mutation(() => DirectorAssignmentResult, { name: 'subadminAssignDirectorToSchool' })
  async assignDirectorToSchool(
    @CurrentUser() user: UserEntity,
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @Args('directorId', { type: () => ID }) directorId: string,
  ) {
    return this.subadminService.assignDirectorToSchool(
      user.id,
      schoolId,
      directorId,
    );
  }

  @Mutation(() => Boolean, { name: 'subadminRemoveDirectorFromSchool' })
  async removeDirectorFromSchool(
    @CurrentUser() user: UserEntity,
    @Args('schoolId', { type: () => ID }) schoolId: string,
    @Args('directorId', { type: () => ID }) directorId: string,
  ) {
    return this.subadminService.removeDirectorFromSchool(
      user.id,
      schoolId,
      directorId,
    );
  }

  @Mutation(() => Task, { name: 'subadminCreateTask' })
  async createTask(
    @CurrentUser() user: UserEntity,
    @Args('input') input: CreateSubadminTaskInput,
  ) {
    return this.subadminService.createSubadminTask(user.id, input);
  }

  @Mutation(() => Task, { name: 'subadminMoveTask' })
  async moveTask(
    @CurrentUser() user: UserEntity,
    @Args('input') input: SubadminMoveTaskInput,
  ) {
    return this.subadminService.moveSubadminTask(user.id, input);
  }

  @Mutation(() => Boolean, { name: 'subadminRegisterShipment' })
  async registerShipment(
    @CurrentUser() user: UserEntity,
    @Args('input') input: CreateShipmentInput,
  ) {
    await this.subadminService.registerShipment(user.id, input);
    return true;
  }

  @Mutation(() => [SubadminGlobalNoticeRecord], {
    name: 'subadminCreateGlobalNoticeCampaign',
  })
  async createGlobalNoticeCampaign(
    @CurrentUser() user: UserEntity,
    @Args('input') input: CreateSubadminGlobalNoticeInput,
  ) {
    return this.subadminService.createGlobalNoticeCampaign(user.id, input);
  }
}
