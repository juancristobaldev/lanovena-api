import { Field, Float, ID, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  SchoolMode,
  TargetAudience,
  TaskPriority,
  TaskStatus,
  ViaNotice,
} from '@prisma/client';
import { UserEntity } from './user.entity';
import { SchoolEntity } from './school.entity';
import { Task } from './tasks.entity';

export enum SubadminAlertStatus {
  OK = 'ok',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

registerEnumType(SubadminAlertStatus, { name: 'SubadminAlertStatus' });

@InputType()
export class CreateManagedSchoolInput {
  @Field()
  name: string;

  @Field()
  slug: string;

  @Field(() => SchoolMode, { defaultValue: SchoolMode.COMMERCIAL })
  mode: SchoolMode;

  @Field({ nullable: true })
  subscriptionStatus?: string;

  @Field({ nullable: true })
  planLimitId?: string;

  @Field(() => Float, { defaultValue: 20000 })
  monthlyFee: number;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  @Field(() => [ID], { nullable: true })
  directorIds?: string[];
}

@InputType()
export class CreateManagedDirectorInput {
  @Field()
  email: string;

  @Field()
  fullName: string;

  @Field()
  password: string;

  @Field({ nullable: true })
  phone?: string;

  @Field(() => ID, { nullable: true })
  schoolId?: string;
}

@InputType()
export class CreateSubadminTaskInput {
  @Field(() => ID)
  schoolId: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => TaskPriority, { defaultValue: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Field({ nullable: true })
  dueDate?: Date;

  @Field(() => ID, { nullable: true })
  assignedToUserId?: string;
}

@InputType()
export class SubadminMoveTaskInput {
  @Field(() => ID)
  taskId: string;

  @Field(() => TaskStatus)
  status: TaskStatus;

  @Field(() => Int)
  position: number;
}

@InputType()
export class CreateShipmentInput {
  @Field(() => ID)
  schoolId: string;

  @Field()
  itemName: string;

  @Field(() => Int)
  quantity: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  receiverSignature?: string;
}

@InputType()
export class CreateSubadminGlobalNoticeInput {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => [TargetAudience], { nullable: true })
  audiences?: TargetAudience[];

  @Field(() => [ID], { nullable: true })
  schoolIds?: string[];

  @Field(() => [ViaNotice], { nullable: true })
  vias?: ViaNotice[];
}

@ObjectType()
export class ManagedSchoolDirectory {
  @Field(() => SchoolEntity)
  school: SchoolEntity;

  @Field(() => [UserEntity])
  directors: UserEntity[];
}

@ObjectType()
export class SubadminDashboardStats {
  @Field(() => Int)
  totalSchools: number;

  @Field(() => Int)
  activeSchools: number;

  @Field(() => Int)
  totalPlayers: number;

  @Field(() => Int)
  totalDirectors: number;

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Float)
  abandonmentRate: number;

  @Field(() => Float)
  globalAttendanceRate: number;
}

@ObjectType()
export class DirectorAssignmentResult {
  @Field(() => SchoolEntity)
  school: SchoolEntity;

  @Field(() => UserEntity)
  director: UserEntity;

  @Field()
  role: string;
}

@ObjectType()
export class SubadminMonthlyTrendPoint {
  @Field()
  label: string;

  @Field(() => Float)
  revenue: number;

  @Field(() => Int)
  dropouts: number;

  @Field(() => Float)
  attendanceRate: number;
}

@ObjectType()
export class SubadminNetworkAlert {
  @Field()
  id: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => SubadminAlertStatus)
  status: SubadminAlertStatus;
}

@ObjectType()
export class SubadminIntelligenceOverview {
  @Field(() => SubadminDashboardStats)
  stats: SubadminDashboardStats;

  @Field(() => [SubadminMonthlyTrendPoint])
  trend: SubadminMonthlyTrendPoint[];

  @Field(() => [SubadminNetworkAlert])
  alerts: SubadminNetworkAlert[];
}

@ObjectType()
export class SubadminRadarSchool {
  @Field(() => ID)
  schoolId: string;

  @Field()
  name: string;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Float)
  attendanceRate: number;

  @Field(() => Int)
  players: number;

  @Field(() => Int)
  directors: number;

  @Field(() => SubadminAlertStatus)
  status: SubadminAlertStatus;
}

@ObjectType()
export class SubadminSchoolDirectoryItem {
  @Field(() => ID)
  schoolId: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int)
  players: number;

  @Field(() => Float)
  attendanceRate: number;

  @Field(() => Int)
  directors: number;
}

@ObjectType()
export class SubadminStaffPerformance {
  @Field(() => ID)
  userId: string;

  @Field()
  fullName: string;

  @Field()
  role: string;

  @Field()
  schoolName: string;

  @Field(() => Int)
  sessions: number;

  @Field(() => Float)
  rating: number;
}

@ObjectType()
export class SubadminFinanceBySchool {
  @Field(() => ID)
  schoolId: string;

  @Field()
  schoolName: string;

  @Field(() => Float)
  collected: number;

  @Field(() => Float)
  debt: number;
}

@ObjectType()
export class SubadminFinanceOverview {
  @Field(() => Float)
  totalCollected: number;

  @Field(() => Float)
  totalDebt: number;

  @Field(() => [SubadminFinanceBySchool])
  bySchool: SubadminFinanceBySchool[];
}

@ObjectType()
export class SubadminOperationsOverview {
  @Field(() => Int)
  todo: number;

  @Field(() => Int)
  inProgress: number;

  @Field(() => Int)
  done: number;

  @Field(() => [Task])
  tasks: Task[];
}

@ObjectType()
export class SubadminTopScorer {
  @Field(() => ID)
  playerId: string;

  @Field()
  fullName: string;

  @Field()
  schoolName: string;

  @Field(() => Int)
  goals: number;
}

@ObjectType()
export class SubadminRecentMatch {
  @Field(() => ID)
  matchId: string;

  @Field()
  schoolName: string;

  @Field()
  categoryName: string;

  @Field()
  rivalName: string;

  @Field(() => Date)
  date: Date;

  @Field(() => Int)
  goalsFor: number;

  @Field(() => Int)
  goalsAgainst: number;
}

@ObjectType()
export class SubadminSportsOverview {
  @Field(() => [SubadminTopScorer])
  topScorers: SubadminTopScorer[];

  @Field(() => [SubadminRecentMatch])
  recentMatches: SubadminRecentMatch[];
}

@ObjectType()
export class SubadminInventoryCounter {
  @Field()
  itemName: string;

  @Field(() => Int)
  stock: number;
}

@ObjectType()
export class SubadminShipmentRecord {
  @Field(() => ID)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field()
  schoolName: string;

  @Field()
  itemName: string;

  @Field(() => Int)
  quantity: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  receiverSignature?: string;
}

@ObjectType()
export class SubadminInventoryOverview {
  @Field(() => [SubadminInventoryCounter])
  counters: SubadminInventoryCounter[];

  @Field(() => [SubadminShipmentRecord])
  shipments: SubadminShipmentRecord[];
}

@ObjectType()
export class SubadminGlobalNoticeRecord {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => ViaNotice)
  via: ViaNotice;

  @Field(() => TargetAudience, { nullable: true })
  targetAudience?: TargetAudience;

  @Field(() => Date, { nullable: true })
  createdAt?: Date;
}
