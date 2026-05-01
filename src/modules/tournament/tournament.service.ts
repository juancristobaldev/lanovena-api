import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Role,
  MatchStatus,
  TournamentStatus,
  Prisma,
  MatchPeriod,
  MatchEventType,
  MatchTeamSide,
} from '@prisma/client';
import { CreateUserInput } from '@/entitys/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TournamentService {
  constructor(private readonly prisma: PrismaService) {}

  // ===============================
  // 🏆 LEAGUES
  // ===============================

  async getLeagues() {
    return this.prisma.tournament.findMany({
      include: {
        organizer: true,
        planner: true, // 🔥 Planner incluido desde el torneo
        teams: true,
        settings: true,
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
            stats: {
              include: {
                player: true,
              },
            },
            events: {
              include: {
                player: true,
              },
            },
            rosterValidations: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    }).then((leagues) =>
      leagues.map((league) => ({
        ...league,
        staff: league.planner,
      })),
    );
  }

  async getLeagueById(id: string) {
    const league = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        organizer: true,
        planner: true, // 🔥 Añadido aquí
        settings: true,
        teams: {
          include: {
            players: true,
          },
        },
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
            stats: {
              include: {
                player: true,
              },
            },
            events: {
              include: {
                player: true,
              },
            },
            rosterValidations: {
              include: {
                player: true,
              },
            },
          },
        },
        standings: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!league) throw new NotFoundException('Liga no encontrada');

    return {
      ...league,
      staff: league.planner,
    };
  }

  async createLeague(
    input: Prisma.TournamentCreateInput,
    newOrganizer: Prisma.UserCreateInput,
    planner?: CreateUserInput,
    staff?: CreateUserInput,
  ) {
    const { name, format, settings } = input;
    const staffInput = staff ?? planner;

    if (!staffInput) {
      throw new Error('Es obligatorio crear un staff para el torneo.');
    }

    const organizerPasswordHash = await bcrypt.hash(newOrganizer.password, 10);
    const plannerPasswordHash = await bcrypt.hash(staffInput.password, 10);

    return this.prisma.tournament.create({
      data: {
        name,
        format,
        organizer: {
          create: {
            email: newOrganizer.email.trim().toLowerCase(),
            password: organizerPasswordHash,
            fullName: newOrganizer.fullName,
            phone: newOrganizer.phone,
            role: Role.LEAGUE_OWNER,
          },
        },
        planner: {
          create: {
            email: staffInput.email.trim().toLowerCase(),
            password: plannerPasswordHash,
            fullName: staffInput.fullName,
            phone: staffInput.phone,
            role: Role.PLANNER,
          },
        }, // 🔥 SE CREA EL PLANILLERO JUNTO CON EL TORNEO
        settings: settings
          ? {
              create: settings as any,
            }
          : undefined,
      },
      include: {
        organizer: true,
        planner: true,
        settings: true,
      },
    }).then((league) => ({
      ...league,
      staff: league.planner,
    }));
  }

  async cancelLeague(leagueId: string) {
    return this.prisma.tournament.update({
      where: { id: leagueId },
      data: { status: TournamentStatus.CANCELLED },
    });
  }

  // ===============================
  // ⚽ TEAMS
  // ===============================

  async createTeam(tournamentId: string, name: string) {
    return this.prisma.tournamentTeam.create({
      data: {
        name,
        tournamentId,
      },
    });
  }

  async getTeams(tournamentId: string) {
    return this.prisma.tournamentTeam.findMany({
      where: { tournamentId },
      include: {
        players: true,
      },
    });
  }

  // ===============================
  // 👤 PLAYERS
  // ===============================

  async addPlayerToTeam(teamId: string, data: any) {
    return this.prisma.tournamentPlayer.create({
      data: {
        ...data,
        teamId,
      },
    });
  }

  async getPlayers(teamId: string) {
    return this.prisma.tournamentPlayer.findMany({
      where: { teamId },
    });
  }

  // ===============================
  // 🏟 MATCHES
  // ===============================

  async createMatch(data: {
    tournamentId: string;
    homeTeamId: string;
    awayTeamId: string;
    date: Date;
    round: number;
  }) {
    return this.prisma.tournamentMatch.create({
      data: {
        ...data,
        status: MatchStatus.SCHEDULED,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        stats: {
          include: {
            player: true,
          },
        },
        events: {
          include: {
            player: true,
          },
        },
        rosterValidations: {
          include: {
            player: true,
          },
        },
        // 🔥 planner eliminado
      },
    });
  }

  async getPlannerAgenda(plannerId: string) {
    const leagues = await this.prisma.tournament.findMany({
      where: { plannerId },
      include: {
        matches: {
          where: {
            status: {
              in: [
                MatchStatus.SCHEDULED,
                MatchStatus.ROSTER_LOCKED,
                MatchStatus.IN_PROGRESS,
                MatchStatus.FINISHED,
              ],
            },
          },
          include: {
            homeTeam: true,
            awayTeam: true,
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return leagues.flatMap((league) =>
      league.matches.map((match) => ({
        leagueId: league.id,
        leagueName: league.name,
        match,
      })),
    );
  }

  async getMatches(tournamentId: string) {
    return this.prisma.tournamentMatch.findMany({
      where: { tournamentId },
      include: {
        homeTeam: true,
        awayTeam: true,
        // 🔥 planner eliminado
      },
      orderBy: { round: 'asc' },
    });
  }

  async playMatch(matchId: string, homeScore: number, awayScore: number) {
    const match = await this.prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        status: MatchStatus.PLAYED,
      },
    });

    await this.recomputeStandings(match.tournamentId);

    return match;
  }

  async validateMatchResult(
    matchId: string,
    homeScore: number,
    awayScore: number,
  ) {
    const match = await this.prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        status: MatchStatus.PLAYED,
      },
    });

    await this.recomputeStandings(match.tournamentId);

    return match;
  }

  async lockMatchRoster(data: {
    matchId: string;
    verifiedHomePlayerIds: string[];
    verifiedAwayPlayerIds: string[];
    allowInsufficientPlayers?: boolean;
  }) {
    const match = await this.prisma.tournamentMatch.findUnique({
      where: { id: data.matchId },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
      },
    });

    if (!match) throw new NotFoundException('Partido no encontrado');
    if (match.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException('Solo se puede bloquear nómina en estado programado');
    }

    if (!data.allowInsufficientPlayers) {
      if (data.verifiedHomePlayerIds.length < 7 || data.verifiedAwayPlayerIds.length < 7) {
        throw new BadRequestException('Se requieren al menos 7 jugadores por equipo');
      }
    }

    const homeSet = new Set(data.verifiedHomePlayerIds);
    const awaySet = new Set(data.verifiedAwayPlayerIds);

    await this.prisma.$transaction([
      this.prisma.tournamentMatchRoster.deleteMany({ where: { matchId: data.matchId } }),
      this.prisma.tournamentMatchRoster.createMany({
        data: [
          ...match.homeTeam.players.map((player) => ({
            matchId: data.matchId,
            playerId: player.id,
            teamSide: MatchTeamSide.HOME,
            verified: homeSet.has(player.id),
            suspendedSnapshot: false,
          })),
          ...match.awayTeam.players.map((player) => ({
            matchId: data.matchId,
            playerId: player.id,
            teamSide: MatchTeamSide.AWAY,
            verified: awaySet.has(player.id),
            suspendedSnapshot: false,
          })),
        ],
      }),
      this.prisma.tournamentMatch.update({
        where: { id: data.matchId },
        data: {
          status: MatchStatus.ROSTER_LOCKED,
          currentPeriod: MatchPeriod.PREVIA,
        },
      }),
    ]);

    return this.getMatchById(data.matchId);
  }

  async addMatchEvent(data: {
    matchId: string;
    teamSide: MatchTeamSide;
    type: MatchEventType;
    minute: number;
    playerId?: string;
    description?: string;
  }) {
    const match = await this.prisma.tournamentMatch.findUnique({ where: { id: data.matchId } });
    if (!match) throw new NotFoundException('Partido no encontrado');
    if (
      match.status !== MatchStatus.IN_PROGRESS &&
      match.status !== MatchStatus.FINISHED
    ) {
      throw new BadRequestException('Solo puedes registrar eventos con partido en curso o finalizado');
    }

    const created = await this.prisma.tournamentMatchEvent.create({
      data,
      include: { player: true },
    });

    return created;
  }

  async removeMatchEvent(eventId: string) {
    return this.prisma.tournamentMatchEvent.delete({ where: { id: eventId }, include: { player: true } });
  }

  async setMatchPeriod(matchId: string, period: MatchPeriod) {
    const statusByPeriod: Record<MatchPeriod, MatchStatus> = {
      PREVIA: MatchStatus.ROSTER_LOCKED,
      FIRST_HALF: MatchStatus.IN_PROGRESS,
      BREAK: MatchStatus.IN_PROGRESS,
      SECOND_HALF: MatchStatus.IN_PROGRESS,
      FINAL: MatchStatus.FINISHED,
    };

    const status = statusByPeriod[period];

    const updated = await this.prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        currentPeriod: period,
        status,
        startedAt: period === MatchPeriod.FIRST_HALF ? new Date() : undefined,
        finishedAt: period === MatchPeriod.FINAL ? new Date() : undefined,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        events: { include: { player: true } },
        rosterValidations: { include: { player: true } },
      },
    });

    return updated;
  }

  async submitMatchSheet(data: { matchId: string; notes: string }) {
    if (!data.notes?.trim()) {
      throw new BadRequestException('Debes agregar observaciones antes de enviar la planilla');
    }

    const match = await this.prisma.tournamentMatch.findUnique({ where: { id: data.matchId } });
    if (!match) throw new NotFoundException('Partido no encontrado');
    if (match.status !== MatchStatus.FINISHED) {
      throw new BadRequestException('Solo puedes enviar una planilla con partido finalizado');
    }

    const events = await this.prisma.tournamentMatchEvent.findMany({ where: { matchId: data.matchId } });
    const homeGoals = events.filter((e) => e.type === MatchEventType.GOAL && e.teamSide === MatchTeamSide.HOME).length;
    const awayGoals = events.filter((e) => e.type === MatchEventType.GOAL && e.teamSide === MatchTeamSide.AWAY).length;

    return this.prisma.tournamentMatch.update({
      where: { id: data.matchId },
      data: {
        notes: data.notes.trim(),
        submittedAt: new Date(),
        status: MatchStatus.SUBMITTED,
        homeScore: homeGoals,
        awayScore: awayGoals,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        events: { include: { player: true } },
        rosterValidations: { include: { player: true } },
      },
    });
  }

  async getMatchById(matchId: string) {
    return this.prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        events: { include: { player: true }, orderBy: { minute: 'asc' } },
        rosterValidations: { include: { player: true } },
      },
    });
  }

  async updateMatchSchedule(data: {
    matchId: string;
    date?: Date;
    round?: number;
    homeTeamId?: string;
    awayTeamId?: string;
    status?: MatchStatus;
  }) {
    const { matchId, ...rest } = data;

    return this.prisma.tournamentMatch.update({
      where: { id: matchId },
      data: rest,
      include: {
        homeTeam: true,
        awayTeam: true,
        stats: {
          include: {
            player: true,
          },
        },
      },
    });
  }

  async updateLeagueSettings(data: {
    tournamentId: string;
    pointsWin?: number;
    pointsDraw?: number;
    pointsLoss?: number;
  }) {
    const { tournamentId, ...rest } = data;

    const settings = await this.prisma.tournamentSettings.upsert({
      where: { tournamentId },
      create: {
        tournamentId,
        ...rest,
      },
      update: rest,
    });

    await this.recomputeStandings(tournamentId);

    return settings;
  }

  async removeTournamentPlayer(playerId: string) {
    return this.prisma.tournamentPlayer.delete({
      where: { id: playerId },
    });
  }

  // ===============================
  // 🏆 STANDINGS (CON SETTINGS DINÁMICOS)
  // ===============================

  async updateStandings(match: any) {
    const { homeTeamId, awayTeamId, homeScore, awayScore, tournamentId } =
      match;

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { settings: true },
    });

    const pointsWin = tournament?.settings?.pointsWin ?? 3;
    const pointsDraw = tournament?.settings?.pointsDraw ?? 1;

    const home = await this.getOrCreateStanding(homeTeamId, tournamentId);
    const away = await this.getOrCreateStanding(awayTeamId, tournamentId);

    const homeData = { ...home };
    const awayData = { ...away };

    homeData.played++;
    awayData.played++;

    homeData.goalsFor += homeScore;
    homeData.goalsAgainst += awayScore;

    awayData.goalsFor += awayScore;
    awayData.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeData.wins++;
      homeData.points += pointsWin;
      awayData.losses++;
    } else if (homeScore < awayScore) {
      awayData.wins++;
      awayData.points += pointsWin;
      homeData.losses++;
    } else {
      homeData.draws++;
      awayData.draws++;
      homeData.points += pointsDraw;
      awayData.points += pointsDraw;
    }

    await this.prisma.tournamentStanding.update({
      where: {
        teamId_tournamentId: {
          teamId: homeTeamId,
          tournamentId,
        },
      },
      data: homeData,
    });

    await this.prisma.tournamentStanding.update({
      where: {
        teamId_tournamentId: {
          teamId: awayTeamId,
          tournamentId,
        },
      },
      data: awayData,
    });
  }

  async getOrCreateStanding(teamId: string, tournamentId: string) {
    let standing = await this.prisma.tournamentStanding.findUnique({
      where: {
        teamId_tournamentId: {
          teamId,
          tournamentId,
        },
      },
    });

    if (!standing) {
      standing = await this.prisma.tournamentStanding.create({
        data: {
          teamId,
          tournamentId,
        },
      });
    }

    return standing;
  }

  async getStandings(tournamentId: string) {
    return this.prisma.tournamentStanding.findMany({
      where: { tournamentId },
      include: {
        team: true,
      },
      orderBy: [
        { points: 'desc' },
        { goalsFor: 'desc' },
        { goalsAgainst: 'asc' },
      ],
    });
  }

  private async recomputeStandings(tournamentId: string) {
    const teams = await this.prisma.tournamentTeam.findMany({
      where: { tournamentId },
      select: { id: true },
    });

    await Promise.all(
      teams.map((team) =>
        this.prisma.tournamentStanding.upsert({
          where: {
            teamId_tournamentId: {
              teamId: team.id,
              tournamentId,
            },
          },
          create: {
            teamId: team.id,
            tournamentId,
          },
          update: {
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0,
          },
        }),
      ),
    );

    const playedMatches = await this.prisma.tournamentMatch.findMany({
      where: {
        tournamentId,
        status: MatchStatus.PLAYED,
      },
      orderBy: { round: 'asc' },
    });

    for (const match of playedMatches) {
      await this.updateStandings(match);
    }
  }

  // ===============================
  // 🔥 FIXTURE
  // ===============================

  async generateFixture(tournamentId: string) {
    // 🔥 Ya no requiere planner aquí, el planner se generó en createLeague.
    const teams = await this.prisma.tournamentTeam.findMany({
      where: { tournamentId },
    });

    if (teams.length < 2) {
      throw new Error('Se necesitan al menos 2 equipos');
    }

    let round = 1;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        await this.prisma.tournamentMatch.create({
          data: {
            tournamentId,
            homeTeamId: teams[i].id,
            awayTeamId: teams[j].id,
            // plannerId ELIMINADO
            date: new Date(),
            round,
            status: MatchStatus.SCHEDULED,
          },
        });
        round++;
      }
    }

    return { message: 'Fixture generado correctamente' };
  }
}
