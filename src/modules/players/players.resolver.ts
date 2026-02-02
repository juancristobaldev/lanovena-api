import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import {
  CreatePlayerInput,
  EventType,
  NextEvent,
  PlayerEntity,
  PlayerFinancialStatus,
  PlayerStats,
  UpdatePlayerInput,
} from 'src/entitys/player.entity';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PlayersService } from './players.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserEntity } from 'src/entitys/user.entity';
import { PrismaService } from '../prisma/prisma.service';

@Resolver(() => PlayerEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class PlayersResolver {
  constructor(
    private readonly playersService: PlayersService,
    private readonly prisma: PrismaService,
  ) {}

  /* ===================== MUTATIONS ===================== */

  @Roles(Role.DIRECTOR)
  @Mutation(() => PlayerEntity)
  createPlayer(
    @Args('input') input: CreatePlayerInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.playersService.create(input, user);
  }

  @ResolveField(() => NextEvent, { nullable: true })
  async nextEvent(@Parent() player: PlayerEntity): Promise<NextEvent | null> {
    const now = new Date();

    // 1. Buscar el PRÓXIMO PARTIDO
    const nextMatch = await this.prisma.match.findFirst({
      where: {
        categoryId: player.categoryId,
        date: { gte: now }, // Mayor o igual a hoy
      },
      orderBy: { date: 'asc' },
    });

    // 2. Buscar el PRÓXIMO ENTRENAMIENTO
    const nextTraining = await this.prisma.trainingSession.findFirst({
      where: {
        categoryId: player.categoryId,
        date: { gte: now },
      },
      orderBy: { date: 'asc' },
    });

    // 3. Lógica de Comparación: ¿Cuál ocurre primero?
    let closestEvent: any = null;
    let type = EventType.TRAINING;

    if (nextMatch && nextTraining) {
      // Si hay ambos, vemos cual es antes
      if (nextMatch.date < nextTraining.date) {
        closestEvent = nextMatch;
        type = EventType.MATCH;
      } else {
        closestEvent = nextTraining;
        type = EventType.TRAINING;
      }
    } else if (nextMatch) {
      // Solo hay partido
      closestEvent = nextMatch;
      type = EventType.MATCH;
    } else if (nextTraining) {
      // Solo hay entrenamiento
      closestEvent = nextTraining;
      type = EventType.TRAINING;
    } else {
      // No hay nada programado
      return null;
    }

    // 4. Formatear el resultado para el Frontend
    return {
      id: closestEvent.id,
      // Si es partido: "vs Rival", si es entreno: "Entrenamiento"
      title:
        type === 'MATCH'
          ? closestEvent.isHome
            ? `vs ${closestEvent.rivalName}`
            : `@ ${closestEvent.rivalName}`
          : 'Entrenamiento',
      date: closestEvent.date,
      type: type,
      location:
        closestEvent.location ||
        (type === 'MATCH' && closestEvent.isHome ? 'Casa' : 'Por definir'),
      isCitado: true, // Aquí podrías conectar tu lógica de asistencia real
    };
  }

  @ResolveField(() => PlayerStats)
  async stats(@Parent() player: PlayerEntity): Promise<PlayerStats> {
    // 1. Obtener última asistencia (PRESENT)
    const lastAttendanceRecord = await this.prisma.attendance.findFirst({
      where: {
        playerId: player.id,
        status: 'PRESENT',
      },
      orderBy: {
        session: { date: 'desc' },
      },
      include: { session: true },
    });

    // 2. Calcular Tasa de Asistencia (Últimos 3 meses o Total)
    // Para simplificar, calculamos sobre el total de sesiones de su categoría
    const totalSessions = await this.prisma.trainingSession.count({
      where: { categoryId: player.categoryId },
    });

    const attendedSessions = await this.prisma.attendance.count({
      where: {
        playerId: player.id,
        status: 'PRESENT',
      },
    });

    // Evitar división por cero
    const rate =
      totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

    return {
      attendanceRate: Math.round(rate),
      lastAttendance: lastAttendanceRecord?.session?.date,
    };
  }

  /**
   * Calcula estado financiero y deuda
   */
  @ResolveField(() => PlayerFinancialStatus)
  async financialStatus(
    @Parent() player: PlayerEntity,
  ): Promise<PlayerFinancialStatus> {
    // CASO 1: Si es becado, siempre está al día
    if (player.scholarship) {
      return {
        status: PaymentStatus.WAIVED,
        debtAmount: 0,
        lastPaymentDate: new Date(), // O null
      };
    }

    // CASO 2: Calcular Deuda Real
    // Sumamos todas las cuotas PENDING o OVERDUE
    const debtAggregation = await this.prisma.monthlyFee.aggregate({
      where: {
        playerId: player.id,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
      },
      _sum: {
        amount: true,
      },
    });

    const debtAmount = debtAggregation._sum.amount || 0;

    // Determinar Estado General
    // Si tiene deuda > 0, verificamos si alguna es OVERDUE (Vencida)
    let status: PaymentStatus = PaymentStatus.PAID;

    if (debtAmount > 0) {
      const hasOverdue = await this.prisma.monthlyFee.findFirst({
        where: { playerId: player.id, status: PaymentStatus.OVERDUE },
      });

      status = hasOverdue ? PaymentStatus.OVERDUE : PaymentStatus.PENDING;
    }

    // Obtener fecha último pago
    const lastPayment = await this.prisma.monthlyFee.findFirst({
      where: { playerId: player.id, status: PaymentStatus.PAID },
      orderBy: { paidAt: 'desc' },
    });

    return {
      status,
      debtAmount,
      lastPaymentDate: lastPayment?.paidAt || undefined,
    };
  }

  @Roles(Role.DIRECTOR)
  @Mutation(() => PlayerEntity)
  updatePlayer(
    @Args('playerId', { type: () => String }) playerId: string,
    @Args('input') input: UpdatePlayerInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.playersService.update(playerId, input, user);
  }

  @Roles(Role.DIRECTOR)
  @Mutation(() => PlayerEntity)
  togglePlayerActive(
    @Args('playerId', { type: () => String }) playerId: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.playersService.toggleActive(playerId, user);
  }

  /* ===================== QUERIES ===================== */
  @Query(() => [PlayerEntity])
  playersBySchool(
    @Args('schoolId', { type: () => String, nullable: true }) schoolId: string,
    @CurrentUser() user: UserEntity,
  ) {
    // Si es SuperAdmin y envía ID, usa ese. Si es Director, fuerza su propio ID.
    const targetSchoolId =
      (user.role === 'SUPERADMIN' || user?.role === 'DIRECTOR') && schoolId
        ? schoolId
        : user.schoolId;

    return this.playersService.findBySchool(targetSchoolId);
    // NOTA: Asegúrate de tener este método en playersService que haga:
    // prisma.player.findMany({ where: { schoolId } })
  }

  @Roles(Role.COACH)
  @Query(() => [PlayerEntity])
  playersByCategory(
    @Args('categoryId', { type: () => String }) categoryId: string,
    @CurrentUser() user: UserEntity,
  ) {
    if (!user.schoolId) return;
    return this.playersService.findByCategory(categoryId, user.schoolId);
  }

  @Roles(Role.GUARDIAN)
  @Query(() => [PlayerEntity])
  playersByGuardian(
    @Args('guardianId', { type: () => String }) guardianId: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.playersService.findByGuardian(guardianId, user);
  }

  @Roles(Role.GUARDIAN)
  @Query(() => PlayerEntity)
  playerProfile(
    @Args('playerId', { type: () => String }) playerId: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.playersService.findProfile(playerId, user);
  }

  @Roles(Role.COACH)
  @Query(() => PlayerEntity)
  scanQrPlayer(
    @Args('qrCodeToken') qrCodeToken: string,
    @CurrentUser() user: UserEntity,
  ) {
    if (!user.schoolId) return;

    return this.playersService.scanQr(qrCodeToken, user.schoolId);
  }
}
