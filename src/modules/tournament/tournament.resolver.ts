import { Int, Resolver, Query, Mutation, Args } from '@nestjs/graphql';

import { TournamentService } from './tournament.service';
import {
  CreateLeagueInput,
  CreateTeamInput,
  CreateTournamentMatchInput,
  CreateTournamentPlayerInput,
  Tournament,
  TournamentMatch,
  TournamentPlayer,
  TournamentStanding,
  TournamentTeam,
} from '@/entitys/tournament.entity';
import { CreateUserInput } from '@/entitys/user.entity';

// ===============================
// RESOLVER
// ===============================

@Resolver(() => Tournament)
export class TournamentResolver {
  constructor(private readonly service: TournamentService) {}

  // ===============================
  // QUERIES
  // ===============================

  @Query(() => [Tournament])
  async leagues() {
    return this.service.getLeagues();
  }

  @Query(() => Tournament)
  async league(@Args('id') id: string) {
    return this.service.getLeagueById(id);
  }

  @Query(() => [TournamentTeam])
  async teams(@Args('tournamentId') tournamentId: string) {
    return this.service.getTeams(tournamentId);
  }

  @Query(() => [TournamentPlayer])
  async players(@Args('teamId') teamId: string) {
    return this.service.getPlayers(teamId);
  }

  @Query(() => [TournamentMatch])
  async matches(@Args('tournamentId') tournamentId: string) {
    return this.service.getMatches(tournamentId);
  }

  @Query(() => [TournamentStanding])
  async standings(@Args('tournamentId') tournamentId: string) {
    return this.service.getStandings(tournamentId);
  }

  // ===============================
  // MUTATIONS
  // ===============================

  @Mutation(() => Tournament)
  async createLeague(@Args('input') input: CreateLeagueInput) {
    return this.service.createLeague(
      {
        name: input.name,
        format: input.format,
        settings: input.settings as any,
      } as any,
      input.organizerId,
      input.newOrganizer as any,
      input.planner as any, // 🔥 SE PASA EL PLANILLERO AL SERVICIO AQUÍ
    );
  }

  @Mutation(() => Tournament)
  async cancelLeague(@Args('leagueId') leagueId: string) {
    return this.service.cancelLeague(leagueId);
  }

  @Mutation(() => TournamentTeam)
  async createTeam(@Args('input') input: CreateTeamInput) {
    return this.service.createTeam(input.tournamentId, input.name);
  }

  @Mutation(() => TournamentPlayer)
  async addPlayer(@Args('input') input: CreateTournamentPlayerInput) {
    return this.service.addPlayerToTeam(input.teamId, input);
  }

  @Mutation(() => TournamentMatch)
  async createMatch(@Args('input') input: CreateTournamentMatchInput) {
    return this.service.createMatch({
      tournamentId: input.tournamentId,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      // 🔥 plannerId eliminado de aquí
      date: input.date,
      round: input.round,
    });
  }

  @Mutation(() => TournamentMatch)
  async playMatch(
    @Args('matchId') matchId: string,
    @Args('homeScore', { type: () => Int }) homeScore: number,
    @Args('awayScore', { type: () => Int }) awayScore: number,
  ) {
    return this.service.playMatch(matchId, homeScore, awayScore);
  }

  @Mutation(() => String)
  async generateFixture(@Args('tournamentId') tournamentId: string) {
    // 🔥 generateFixture ya no pide el planillero, solo el ID del torneo
    const res = await this.service.generateFixture(tournamentId);
    return res.message;
  }
}
