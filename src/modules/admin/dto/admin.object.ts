import { ObjectType, Field, Int, Float, ID } from '@nestjs/graphql';
import { UserEntity } from '@/entitys/user.entity';
import { CountSchool, SchoolEntity } from '@/entitys/school.entity';
import { MonthlyFeeEntity } from '@/entitys/monthly-fee.entity';
import { Role, TournamentStatus, PaymentStatus } from '@prisma/client';
import { ReferralStatus } from '@/entitys/growth.entity';
import { ExerciseDifficulty } from '@/entitys/exercise.entity';

@ObjectType()
export class AdminSchoolObject {
  @Field(() => ID)
  id: string;
  @Field()
  name: string;

  @Field()
  slug: string;

  @Field(() => String, { nullable: true })
  subscriptionStatus?: string | null;

  @Field(() => String, { nullable: true })
  planLimitId?: string | null;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date, { nullable: true })
  nextBillingDate?: Date;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  @Field(() => CountSchool)
  _count: CountSchool;
}
@ObjectType()
export class AdminUserObject {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  fullName: string;

  @Field(() => Role)
  role: Role;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date)
  createdAt: Date;
}
@ObjectType()
export class BillingOverviewObject {
  @Field(() => ID)
  id: string;

  @Field(() => Float)
  amount: number;

  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Field(() => Date)
  dueDate: Date;

  @Field(() => SchoolEntity)
  school: SchoolEntity;

  @Field(() => UserEntity)
  player: UserEntity;
}

@ObjectType()
export class OverdueSchoolObject {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Int)
  overduePayments: number;

  @Field(() => Float)
  totalDebt: number;
}

@ObjectType()
export class ReferralObject {
  @Field(() => ID)
  id: string;

  @Field(() => SchoolEntity)
  referrerSchool: SchoolEntity;

  @Field()
  referredSchoolEmail: string;

  @Field(() => ReferralStatus)
  status: ReferralStatus;

  @Field(() => Boolean)
  rewardClaimed: boolean;

  @Field(() => Date)
  createdAt: Date;
}
@ObjectType()
export class SponsorshipObject {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  imageUrl: string;

  @Field({ nullable: true })
  redirectUrl?: string;

  @Field()
  location: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date)
  startDate: Date;

  @Field(() => Date)
  endDate: Date;
}
@ObjectType()
export class ExerciseObject {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => ExerciseDifficulty)
  difficulty: ExerciseDifficulty;

  @Field(() => Boolean)
  isGlobal: boolean;

  @Field(() => Date)
  createdAt: Date;
}
@ObjectType()
export class StrategyObject {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class BoardObject {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => [String])
  tags: string[];

  @Field(() => Date)
  createdAt: Date;
}
@ObjectType()
export class SystemSettingObject {
  @Field()
  key: string;

  @Field()
  value: string;

  @Field(() => Date)
  updatedAt: Date;
}
@ObjectType()
export class FeatureFlagObject {
  @Field()
  key: string;

  @Field(() => Boolean)
  enabled: boolean;
}
@ObjectType()
export class SupportTicketObject {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  message: string;

  @Field(() => UserEntity)
  user: UserEntity;

  @Field(() => Date)
  createdAt: Date;
}
@ObjectType()
export class AdminDashboardStats {
  @Field(() => Int) totalPlayers: number;
  @Field(() => Int) totalSchools: number;
  @Field(() => Int) totalUsers: number;
  @Field(() => Int) activeSchools: number;
  @Field(() => Float) totalRevenue: number;
}

@ObjectType()
export class RevenueAnalytics {
  @Field(() => Float) totalRevenue: number;
  @Field(() => Int) totalPayments: number;
}

@ObjectType()
export class AdminConversionKpi {
  @Field(() => Int) totalSchools: number;
  @Field(() => Int) activeSchools: number;
  @Field(() => Float) conversionRate: number;
}

@ObjectType()
export class AdminTrendPoint {
  @Field() label: string;
  @Field(() => Int) users: number;
  @Field(() => Int) players: number;
}

@ObjectType()
export class AdminWeeklyActivityPoint {
  @Field() label: string;
  @Field(() => Int) value: number;
}

@ObjectType()
export class AdminStatisticsKpis {
  @Field(() => AdminConversionKpi) conversion: AdminConversionKpi;
  @Field(() => [AdminTrendPoint]) trend: AdminTrendPoint[];
  @Field(() => [AdminWeeklyActivityPoint])
  weeklyActivity: AdminWeeklyActivityPoint[];
}

@ObjectType()
export class MacroEntityObject {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field() type: string;
  @Field(() => Int) schoolsLimit: number;
  @Field(() => UserEntity) admin: UserEntity;
}

@ObjectType()
export class PlanLimitObject {
  @Field(() => ID) id: string;
  @Field(() => String) name: string;
  @Field(() => Int) amount: number;
  @Field(() => String) interval: string;
  @Field(() => String, { nullable: true }) flowId?: string | null;
  @Field(() => String, { nullable: true }) flowIdYearly?: string | null;
  @Field(() => Int) maxSchools: number;
  @Field(() => Int) maxPlayersPerSchool: number;
  @Field(() => Int) maxCategories: number;
  @Field(() => Int) maxGuardianPerPlayer: number;
  @Field(() => Boolean) isActive: boolean;
}

@ObjectType()
export class AdminAuditLogObject {
  @Field(() => ID) id: string;
  @Field() action: string;
  @Field({ nullable: true }) details?: string;
  @Field() adminId: string;
  @Field(() => Date) createdAt: Date;
}

@ObjectType()
export class AdminDirectorObject {
  @Field(() => ID)
  id: string;

  @Field()
  fullName: string;

  @Field()
  email: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  schoolsCount: number;

  @Field(() => String, { nullable: true })
  flowSubscriptionStatus?: string | null;

  @Field(() => String, { nullable: true })
  flowCardStatus?: string | null;

  @Field(() => Boolean)
  canDelete: boolean;

  @Field(() => [String])
  blockers: string[];

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class AdminSafeDeleteResultObject {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;
}
