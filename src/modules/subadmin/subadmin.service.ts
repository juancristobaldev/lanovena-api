import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateManagedDirectorInput,
  CreateManagedSchoolInput,
  CreateShipmentInput,
  CreateSubadminGlobalNoticeInput,
  CreateSubadminTaskInput,
  SubadminAlertStatus,
  SubadminMoveTaskInput,
} from '@/entitys/subadmin.entity';
import {
  AttendanceStatus,
  PaymentStatus,
  Role,
  TargetAudience,
  TaskPriority,
  TaskStatus,
  ViaNotice,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SubadminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(subadminId: string) {
    const macroEntity = await this.getMacroEntityByAdmin(subadminId);
    const schoolIds = await this.getManagedSchoolIds(macroEntity.id);

    const [totalSchools, activeSchools, totalPlayers, inactivePlayers, directors, revenue] =
      await Promise.all([
        this.prisma.school.count({ where: { macroEntityId: macroEntity.id } }),
        this.prisma.school.count({
          where: {
            macroEntityId: macroEntity.id,
            isActive: true,
          },
        }),
        this.prisma.player.count({ where: { schoolId: { in: schoolIds } } }),
        this.prisma.player.count({
          where: {
            schoolId: { in: schoolIds },
            active: false,
          },
        }),
        this.prisma.schoolStaff.count({
          where: {
            role: Role.DIRECTOR,
            schoolId: { in: schoolIds },
          },
        }),
        this.prisma.monthlyFee.aggregate({
          _sum: { amount: true },
          where: {
            status: PaymentStatus.PAID,
            schoolId: { in: schoolIds },
          },
        }),
      ]);

    const globalAttendanceRate = await this.calculateAttendanceRate(schoolIds);

    return {
      totalSchools,
      activeSchools,
      totalPlayers,
      totalDirectors: directors,
      totalRevenue: revenue._sum.amount ?? 0,
      abandonmentRate:
        totalPlayers > 0 ? Number(((inactivePlayers / totalPlayers) * 100).toFixed(1)) : 0,
      globalAttendanceRate,
    };
  }

  async getIntelligenceOverview(subadminId: string) {
    const macroEntity = await this.getMacroEntityByAdmin(subadminId);
    const schoolIds = await this.getManagedSchoolIds(macroEntity.id);

    const [stats, schools, trend] = await Promise.all([
      this.getDashboardStats(subadminId),
      this.getManagedSchools(subadminId),
      this.getMonthlyTrend(schoolIds, 6),
    ]);

    const alerts = schools
      .flatMap((entry) => {
        const base = {
          id: entry.school.id,
          title: entry.school.name,
          description: `${entry.school._count.players} jugadores registrados`,
        };

        if (!entry.school.isActive) {
          return [
            {
              ...base,
              description: 'Sede inactiva. Requiere reactivacion operativa.',
              status: SubadminAlertStatus.CRITICAL,
            },
          ];
        }

        if ((entry.directors || []).length === 0) {
          return [
            {
              ...base,
              description: 'Sede sin director asignado.',
              status: SubadminAlertStatus.WARNING,
            },
          ];
        }

        return [];
      })
      .slice(0, 8);

    return {
      stats,
      trend,
      alerts,
    };
  }

  async getManagedSchools(subadminId: string) {
    const macroEntity = await this.getMacroEntityByAdmin(subadminId);

    const schools = await this.prisma.school.findMany({
      where: { macroEntityId: macroEntity.id },
      include: {
        _count: {
          select: {
            players: true,
            categories: true,
          },
        },
        staff: {
          where: { role: Role.DIRECTOR },
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return schools.map((school) => ({
      school,
      directors: school.staff.map((staff) => staff.user),
    }));
  }

  async getRadarSchools(subadminId: string) {
    const schools = await this.getManagedSchools(subadminId);

    return Promise.all(
      schools.map(async (entry) => {
        const attendanceRate = await this.calculateAttendanceRate([entry.school.id]);
        const hasDirector = entry.directors.length > 0;

        let status = SubadminAlertStatus.OK;
        if (!entry.school.isActive) status = SubadminAlertStatus.CRITICAL;
        else if (!hasDirector || attendanceRate < 65) status = SubadminAlertStatus.WARNING;

        return {
          schoolId: entry.school.id,
          name: entry.school.name,
          latitude: entry.school.latitude,
          longitude: entry.school.longitude,
          isActive: Boolean(entry.school.isActive),
          attendanceRate,
          players: entry.school._count.players || 0,
          directors: entry.directors.length,
          status,
        };
      }),
    );
  }

  async getSchoolDirectory(subadminId: string) {
    const schools = await this.getManagedSchools(subadminId);

    return Promise.all(
      schools.map(async (entry) => ({
        schoolId: entry.school.id,
        name: entry.school.name,
        slug: entry.school.slug,
        isActive: Boolean(entry.school.isActive),
        players: entry.school._count.players || 0,
        attendanceRate: await this.calculateAttendanceRate([entry.school.id]),
        directors: entry.directors.length,
      })),
    );
  }

  async createManagedSchool(subadminId: string, input: CreateManagedSchoolInput) {
    const macroEntity = await this.getMacroEntityByAdmin(subadminId);

    const existingSlug = await this.prisma.school.findUnique({
      where: { slug: input.slug },
    });

    if (existingSlug) {
      throw new BadRequestException('El slug ya esta en uso');
    }

    const school = await this.prisma.school.create({
      data: {
        name: input.name,
        slug: input.slug,
        mode: input.mode,
        subscriptionStatus: input.subscriptionStatus,
        monthlyFee: input.monthlyFee,
        latitude: input.latitude,
        longitude: input.longitude,
        macroEntityId: macroEntity.id,
      },
    });

    if (input.directorIds?.length) {
      for (const directorId of input.directorIds) {
        await this.assignDirectorToSchool(subadminId, school.id, directorId);
        if (input.planLimitId) {
          await this.prisma.user.update({
            where: { id: directorId },
            data: { planLimitId: input.planLimitId },
          });
        }
      }
    }

    return school;
  }

  async createDirector(subadminId: string, input: CreateManagedDirectorInput) {
    await this.getMacroEntityByAdmin(subadminId);

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingEmail) {
      throw new BadRequestException('El email ya esta registrado');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const director = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        password: hashedPassword,
        phone: input.phone,
        role: Role.DIRECTOR,
      },
    });

    if (input.schoolId) {
      await this.assignDirectorToSchool(subadminId, input.schoolId, director.id);
    }

    return director;
  }

  async assignDirectorToSchool(
    subadminId: string,
    schoolId: string,
    directorId: string,
  ) {
    const school = await this.assertSchoolBelongsToSubadmin(subadminId, schoolId);

    const director = await this.prisma.user.findUnique({
      where: { id: directorId },
    });

    if (!director || director.role !== Role.DIRECTOR) {
      throw new NotFoundException('Director no encontrado');
    }

    await this.prisma.schoolStaff.upsert({
      where: {
        userId_schoolId: {
          userId: director.id,
          schoolId: school.id,
        },
      },
      create: {
        userId: director.id,
        schoolId: school.id,
        role: Role.DIRECTOR,
      },
      update: {
        role: Role.DIRECTOR,
      },
    });

    if (!director.schoolId) {
      await this.prisma.user.update({
        where: { id: director.id },
        data: { schoolId: school.id },
      });
    }

    return {
      school,
      director,
      role: Role.DIRECTOR,
    };
  }

  async removeDirectorFromSchool(
    subadminId: string,
    schoolId: string,
    directorId: string,
  ) {
    await this.assertSchoolBelongsToSubadmin(subadminId, schoolId);

    const relation = await this.prisma.schoolStaff.findFirst({
      where: {
        schoolId,
        userId: directorId,
        role: Role.DIRECTOR,
      },
    });

    if (!relation) {
      throw new NotFoundException('Asignacion de director no encontrada');
    }

    await this.prisma.schoolStaff.delete({
      where: {
        userId_schoolId: {
          userId: directorId,
          schoolId,
        },
      },
    });

    const director = await this.prisma.user.findUnique({
      where: { id: directorId },
      select: { schoolId: true },
    });

    if (director?.schoolId === schoolId) {
      await this.prisma.user.update({
        where: { id: directorId },
        data: { schoolId: null },
      });
    }

    return true;
  }

  async getStaffPerformance(subadminId: string) {
    const macroEntity = await this.getMacroEntityByAdmin(subadminId);
    const schools = await this.prisma.school.findMany({
      where: { macroEntityId: macroEntity.id },
      include: {
        staff: {
          where: { role: { in: [Role.DIRECTOR, Role.COACH] } },
          include: {
            user: {
              include: {
                coachProfile: {
                  include: {
                    categories: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const response: any[] = [];

    for (const school of schools) {
      const schoolSessionCount = await this.prisma.trainingSession.count({
        where: {
          category: { schoolId: school.id },
        },
      });

      for (const staff of school.staff) {
        const categoryIds = staff.user.coachProfile?.categories?.map((c) => c.id) || [];
        const sessions =
          staff.role === Role.COACH && categoryIds.length > 0
            ? await this.prisma.trainingSession.count({
                where: {
                  categoryId: { in: categoryIds },
                },
              })
            : schoolSessionCount;

        const ratingAgg = await this.prisma.attendance.aggregate({
          _avg: { rating: true },
          where: {
            rating: { not: null },
            session: {
              category: {
                schoolId: school.id,
              },
            },
          },
        });

        response.push({
          userId: staff.user.id,
          fullName: staff.user.fullName,
          role: staff.role,
          schoolName: school.name,
          sessions,
          rating: Number((ratingAgg._avg.rating || 4).toFixed(1)),
        });
      }
    }

    return response;
  }

  async getFinanceOverview(subadminId: string, month: number, year: number) {
    const macroEntity = await this.getMacroEntityByAdmin(subadminId);
    const schools = await this.prisma.school.findMany({
      where: { macroEntityId: macroEntity.id },
      select: { id: true, name: true },
    });
    const schoolIds = schools.map((s) => s.id);

    const grouped = await this.prisma.monthlyFee.groupBy({
      by: ['schoolId', 'status'],
      _sum: { amount: true },
      where: {
        schoolId: { in: schoolIds },
        month,
        year,
      },
    });

    const bySchool = schools.map((school) => {
      const paid =
        grouped.find((g) => g.schoolId === school.id && g.status === PaymentStatus.PAID)?._sum
          .amount || 0;
      const pending =
        grouped.find((g) => g.schoolId === school.id && g.status === PaymentStatus.PENDING)?._sum
          .amount || 0;
      const overdue =
        grouped.find((g) => g.schoolId === school.id && g.status === PaymentStatus.OVERDUE)?._sum
          .amount || 0;

      return {
        schoolId: school.id,
        schoolName: school.name,
        collected: paid,
        debt: pending + overdue,
      };
    });

    return {
      totalCollected: bySchool.reduce((acc, row) => acc + row.collected, 0),
      totalDebt: bySchool.reduce((acc, row) => acc + row.debt, 0),
      bySchool,
    };
  }

  async getOperationsOverview(subadminId: string, schoolId?: string) {
    const schoolIds = await this.getSchoolScope(subadminId, schoolId);
    const tasks = await this.prisma.task.findMany({
      where: {
        schoolId: { in: schoolIds },
      },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
      include: {
        assignedToUser: true,
      },
      take: 150,
    });

    return {
      todo: tasks.filter((t) => t.status === TaskStatus.TODO).length,
      inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      done: tasks.filter((t) => t.status === TaskStatus.DONE).length,
      tasks,
    };
  }

  async createSubadminTask(subadminId: string, input: CreateSubadminTaskInput) {
    await this.assertSchoolBelongsToSubadmin(subadminId, input.schoolId);

    const lastTask = await this.prisma.task.findFirst({
      where: { schoolId: input.schoolId, status: TaskStatus.TODO },
      orderBy: { position: 'desc' },
    });

    return this.prisma.task.create({
      data: {
        schoolId: input.schoolId,
        title: input.title,
        description: input.description,
        assignedToUserId: input.assignedToUserId,
        dueDate: input.dueDate,
        priority: input.priority || TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        position: lastTask ? lastTask.position + 1024 : 1024,
      },
    });
  }

  async moveSubadminTask(subadminId: string, input: SubadminMoveTaskInput) {
    const task = await this.prisma.task.findUnique({ where: { id: input.taskId } });
    if (!task) throw new NotFoundException('Tarea no encontrada');

    await this.assertSchoolBelongsToSubadmin(subadminId, task.schoolId);

    await this.prisma.task.updateMany({
      where: {
        schoolId: task.schoolId,
        status: input.status,
        position: { gte: input.position },
        id: { not: input.taskId },
      },
      data: {
        position: {
          increment: 1024,
        },
      },
    });

    return this.prisma.task.update({
      where: { id: input.taskId },
      data: {
        status: input.status,
        position: input.position,
      },
    });
  }

  async getSportsOverview(subadminId: string) {
    const macroEntity = await this.getMacroEntityByAdmin(subadminId);
    const schoolIds = await this.getManagedSchoolIds(macroEntity.id);

    const scorers = await this.prisma.matchStat.groupBy({
      by: ['playerId'],
      _sum: {
        goals: true,
      },
      where: {
        player: {
          schoolId: { in: schoolIds },
        },
      },
      orderBy: {
        _sum: {
          goals: 'desc',
        },
      },
      take: 10,
    });

    const topScorers = await Promise.all(
      scorers.map(async (row) => {
        const player = await this.prisma.player.findUnique({
          where: { id: row.playerId },
          include: {
            school: true,
          },
        });

        return {
          playerId: row.playerId,
          fullName: `${player?.firstName || ''} ${player?.lastName || ''}`.trim(),
          schoolName: player?.school?.name || 'Sin sede',
          goals: row._sum.goals || 0,
        };
      }),
    );

    const matches = await this.prisma.match.findMany({
      where: {
        category: {
          schoolId: { in: schoolIds },
        },
      },
      include: {
        category: {
          include: {
            school: true,
          },
        },
        stats: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 12,
    });

    const recentMatches = matches.map((match) => ({
      matchId: match.id,
      schoolName: match.category?.school?.name || 'Sin sede',
      categoryName: match.category?.name || 'Sin categoria',
      rivalName: match.rivalName,
      date: match.date,
      goalsFor: match.stats.reduce((sum, stat) => sum + (stat.goals || 0), 0),
      goalsAgainst: 0,
    }));

    return {
      topScorers,
      recentMatches,
    };
  }

  async getInventoryOverview(subadminId: string) {
    const macroEntity = await this.getMacroEntityByAdmin(subadminId);
    const schools = await this.prisma.school.findMany({
      where: { macroEntityId: macroEntity.id },
      select: {
        id: true,
        name: true,
      },
    });
    const schoolIds = schools.map((s) => s.id);

    const products = await this.prisma.product.findMany({
      where: {
        schoolId: { in: schoolIds },
        active: true,
      },
    });

    const countersMap = new Map<string, number>();
    for (const product of products) {
      const key = product.name.trim().toLowerCase();
      countersMap.set(key, (countersMap.get(key) || 0) + (product.stock || 0));
    }

    const counters = [
      { itemName: 'balones', stock: countersMap.get('balones') || 0 },
      { itemName: 'petos', stock: countersMap.get('petos') || 0 },
      { itemName: 'conos', stock: countersMap.get('conos') || 0 },
      { itemName: 'lentejas', stock: countersMap.get('lentejas') || 0 },
    ];

    const shipmentTasks = await this.prisma.task.findMany({
      where: {
        schoolId: { in: schoolIds },
        title: { startsWith: 'DESPACHO:' },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const schoolById = new Map(schools.map((school) => [school.id, school.name]));

    const shipments = shipmentTasks.map((task) => {
      let parsed: any = {};
      try {
        parsed = task.description ? JSON.parse(task.description) : {};
      } catch {
        parsed = {};
      }

      return {
        id: task.id,
        createdAt: task.createdAt,
        schoolName: schoolById.get(task.schoolId) || 'Sin sede',
        itemName: parsed.itemName || task.title.replace('DESPACHO:', '').trim(),
        quantity: parsed.quantity || 0,
        status: parsed.status || 'en_transito',
        receiverSignature: parsed.receiverSignature,
      };
    });

    return {
      counters,
      shipments,
    };
  }

  async registerShipment(subadminId: string, input: CreateShipmentInput) {
    await this.assertSchoolBelongsToSubadmin(subadminId, input.schoolId);

    const status = input.status.toLowerCase();
    const taskStatus =
      status === 'entregado'
        ? TaskStatus.DONE
        : status === 'en_proceso'
          ? TaskStatus.IN_PROGRESS
          : TaskStatus.TODO;

    const lastTask = await this.prisma.task.findFirst({
      where: {
        schoolId: input.schoolId,
        status: taskStatus,
      },
      orderBy: {
        position: 'desc',
      },
    });

    const task = await this.prisma.task.create({
      data: {
        schoolId: input.schoolId,
        title: `DESPACHO: ${input.itemName}`,
        description: JSON.stringify({
          itemName: input.itemName,
          quantity: input.quantity,
          status: input.status,
          receiverSignature: input.receiverSignature,
        }),
        priority: TaskPriority.MEDIUM,
        status: taskStatus,
        position: lastTask ? lastTask.position + 1024 : 1024,
      },
    });

    const school = await this.prisma.school.findUnique({
      where: { id: input.schoolId },
      select: { name: true },
    });

    return {
      id: task.id,
      createdAt: task.createdAt,
      schoolName: school?.name || 'Sin sede',
      itemName: input.itemName,
      quantity: input.quantity,
      status: input.status,
      receiverSignature: input.receiverSignature,
    };
  }

  async getGlobalNoticeHistory(subadminId: string) {
    await this.getMacroEntityByAdmin(subadminId);

    return this.prisma.globalNotice.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  }

  async createGlobalNoticeCampaign(subadminId: string, input: CreateSubadminGlobalNoticeInput) {
    await this.getMacroEntityByAdmin(subadminId);

    const vias = input.vias?.length ? input.vias : [ViaNotice.APP];
    const audiences = input.audiences?.length ? input.audiences : [null];

    const schoolTag =
      input.schoolIds?.length && input.schoolIds.length > 0
        ? `\n[Sedes]: ${input.schoolIds.join(', ')}`
        : '';

    const payloads: any[] = [];

    for (const via of vias) {
      for (const audience of audiences) {
        payloads.push({
          targetAudience: audience as TargetAudience | null,
          title: input.title,
          description: `${input.description}${schoolTag}`,
          via,
        });
      }
    }

    await this.prisma.globalNotice.createMany({
      data: payloads,
    });

    return this.prisma.globalNotice.findMany({
      orderBy: { createdAt: 'desc' },
      take: payloads.length,
    });
  }

  private async getMonthlyTrend(schoolIds: string[], monthsBack = 6) {
    const now = new Date();
    const trend: any[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      const [revenue, dropouts, attendanceRate] = await Promise.all([
        this.prisma.monthlyFee.aggregate({
          _sum: { amount: true },
          where: {
            schoolId: { in: schoolIds },
            month,
            year,
            status: PaymentStatus.PAID,
          },
        }),
        this.prisma.player.count({
          where: {
            schoolId: { in: schoolIds },
            active: false,
            updatedAt: {
              gte: start,
              lte: end,
            },
          },
        }),
        this.calculateAttendanceRate(schoolIds, start, end),
      ]);

      trend.push({
        label: date.toLocaleDateString('es-CL', { month: 'short' }),
        revenue: revenue._sum.amount || 0,
        dropouts,
        attendanceRate,
      });
    }

    return trend;
  }

  private async calculateAttendanceRate(schoolIds: string[], gte?: Date, lte?: Date) {
    if (!schoolIds.length) return 0;

    const dateFilter =
      gte || lte
        ? {
            createdAt: {
              ...(gte ? { gte } : {}),
              ...(lte ? { lte } : {}),
            },
          }
        : {};

    const [present, late, total] = await Promise.all([
      this.prisma.attendance.count({
        where: {
          session: {
            category: {
              schoolId: { in: schoolIds },
            },
          },
          status: AttendanceStatus.PRESENT,
          ...dateFilter,
        },
      }),
      this.prisma.attendance.count({
        where: {
          session: {
            category: {
              schoolId: { in: schoolIds },
            },
          },
          status: AttendanceStatus.LATE,
          ...dateFilter,
        },
      }),
      this.prisma.attendance.count({
        where: {
          session: {
            category: {
              schoolId: { in: schoolIds },
            },
          },
          ...dateFilter,
        },
      }),
    ]);

    return total > 0 ? Number((((present + late) / total) * 100).toFixed(1)) : 0;
  }

  private async getMacroEntityByAdmin(subadminId: string) {
    const macroEntity = await this.prisma.macroEntity.findFirst({
      where: {
        adminId: subadminId,
      },
    });

    if (!macroEntity) {
      throw new ForbiddenException('El subadmin no tiene macro entidad asignada');
    }

    return macroEntity;
  }

  private async getManagedSchoolIds(macroEntityId: string) {
    const schools = await this.prisma.school.findMany({
      where: { macroEntityId },
      select: { id: true },
    });

    return schools.map((school) => school.id);
  }

  private async getSchoolScope(subadminId: string, schoolId?: string) {
    if (schoolId) {
      await this.assertSchoolBelongsToSubadmin(subadminId, schoolId);
      return [schoolId];
    }

    const macroEntity = await this.getMacroEntityByAdmin(subadminId);
    return this.getManagedSchoolIds(macroEntity.id);
  }

  private async assertSchoolBelongsToSubadmin(subadminId: string, schoolId: string) {
    const macroEntity = await this.getMacroEntityByAdmin(subadminId);

    const school = await this.prisma.school.findFirst({
      where: {
        id: schoolId,
        macroEntityId: macroEntity.id,
      },
      include: {
        _count: {
          select: {
            players: true,
            categories: true,
          },
        },
      },
    });

    if (!school) {
      throw new ForbiddenException('No puedes administrar una escuela fuera de tu entidad');
    }

    return school;
  }
}
