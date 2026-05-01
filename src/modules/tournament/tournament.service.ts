import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, MatchStatus, TournamentStatus, Prisma } from '@prisma/client';
import { CreateUserInput } from '@/entitys/user.entity';

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
      },
    });
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
            // 🔥 planner eliminado de los partidos
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

    return league;
  }

  async createLeague(
    input: Prisma.TournamentCreateInput,
    organizerId?: string,
    newOrganizer?: Prisma.UserCreateInput,
    planner?: CreateUserInput, // 🔥 RECIBIMOS AL PLANILLERO
  ) {
    const { name, format, settings } = input;

    if (!organizerId && !newOrganizer) {
      throw new Error(
        'Debes seleccionar un organizador existente o crear uno nuevo.',
      );
    }

    if (!planner) {
      throw new Error('Es obligatorio crear un planillero para el torneo.');
    }

    let organizerRelation = {};

    if (newOrganizer) {
      organizerRelation = {
        create: {
          email: newOrganizer.email,
          password: newOrganizer.password,
          fullName: newOrganizer.fullName,
          phone: newOrganizer.phone,
          role: Role.DIRECTOR,
        },
      };
    } else {
      organizerRelation = {
        connect: { id: organizerId },
      };
    }

    return this.prisma.tournament.create({
      data: {
        name,
        format,
        organizer: organizerRelation,
        planner: {
          create: {
            email: planner.email,
            password: planner.password,
            fullName: planner.fullName,
            phone: planner.phone,
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
    });
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
        // 🔥 planner eliminado
      },
    });
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

    await this.updateStandings(match);

    return match;
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
