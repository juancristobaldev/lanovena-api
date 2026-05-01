// ===============================
// ENUMS
// ===============================
import {
  Field,
  ID,
  ObjectType,
  InputType,
  Int,
  registerEnumType,
} from '@nestjs/graphql';
import {
  MatchStatus,
  MatchPeriod,
  MatchEventType,
  MatchTeamSide,
  TournamentStatus,
  LeagueFormat,
  PlayerPosition,
} from '@prisma/client';
import { CreateUserInput } from './user.entity';

registerEnumType(TournamentStatus, { name: 'TournamentStatus' });
registerEnumType(MatchStatus, { name: 'MatchStatus' });
registerEnumType(MatchPeriod, { name: 'MatchPeriod' });
registerEnumType(MatchEventType, { name: 'MatchEventType' });
registerEnumType(MatchTeamSide, { name: 'MatchTeamSide' });
registerEnumType(LeagueFormat, { name: 'LeagueFormat' });

// ===============================
// OBJECT TYPES
// ===============================

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  fullName: string;
}

// ===============================
// SETTINGS (NUEVO)
// ===============================

@ObjectType()
export class TournamentSettings {
  @Field(() => Int, { nullable: true })
  maxTeams?: number;

  @Field(() => Int, { nullable: true })
  rounds?: number;

  @Field(() => Int)
  pointsWin: number;

  @Field(() => Int)
  pointsDraw: number;

  @Field(() => Int)
  pointsLoss: number;

  @Field()
  allowDraws: boolean;

  @Field()
  hasPlayoffs: boolean;
}

// ===============================

@ObjectType()
export class TournamentPlayer {
  @Field(() => ID)
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => Int, { nullable: true })
  number?: number;

  @Field(() => PlayerPosition, { nullable: true })
  position?: PlayerPosition;
}

@ObjectType()
export class TournamentPlayerStat {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  yellowCards: number;

  @Field(() => Int)
  redCards: number;

  @Field(() => TournamentPlayer)
  player: TournamentPlayer;
}

@ObjectType()
export class TournamentMatchEvent {
  @Field(() => ID)
  id: string;

  @Field(() => MatchEventType)
  type: MatchEventType;

  @Field(() => MatchTeamSide)
  teamSide: MatchTeamSide;

  @Field(() => Int)
  minute: number;

  @Field({ nullable: true })
  description?: string;

  @Field(() => TournamentPlayer, { nullable: true })
  player?: TournamentPlayer;
}

@ObjectType()
export class TournamentMatchRoster {
  @Field(() => ID)
  id: string;

  @Field(() => MatchTeamSide)
  teamSide: MatchTeamSide;

  @Field()
  verified: boolean;

  @Field()
  suspendedSnapshot: boolean;

  @Field(() => TournamentPlayer)
  player: TournamentPlayer;
}

@ObjectType()
export class TournamentTeam {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => [TournamentPlayer], { nullable: true })
  players?: TournamentPlayer[];
}

// ===============================

@ObjectType()
export class TournamentMatch {
  @Field(() => ID)
  id: string;

  @Field(() => TournamentTeam)
  homeTeam: TournamentTeam;

  @Field(() => TournamentTeam)
  awayTeam: TournamentTeam;

  // 🔥 ELIMINADO: planner ya no pertenece al partido, pertenece al torneo

  @Field(() => Int)
  homeScore: number;

  @Field(() => Int)
  awayScore: number;

  @Field(() => MatchStatus)
  status: MatchStatus;

  @Field()
  date: Date;

  @Field(() => Int)
  round: number;

  @Field(() => MatchPeriod)
  currentPeriod: MatchPeriod;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => [TournamentPlayerStat], { nullable: true })
  stats?: TournamentPlayerStat[];

  @Field(() => [TournamentMatchEvent], { nullable: true })
  events?: TournamentMatchEvent[];

  @Field(() => [TournamentMatchRoster], { nullable: true })
  rosterValidations?: TournamentMatchRoster[];
}

@ObjectType()
export class PlannerAgendaItem {
  @Field()
  leagueId: string;

  @Field()
  leagueName: string;

  @Field(() => TournamentMatch)
  match: TournamentMatch;
}

// ===============================

@ObjectType()
export class TournamentStanding {
  @Field(() => ID)
  id: string;

  @Field(() => TournamentTeam)
  team: TournamentTeam;

  @Field(() => Int)
  played: number;

  @Field(() => Int)
  wins: number;

  @Field(() => Int)
  draws: number;

  @Field(() => Int)
  losses: number;

  @Field(() => Int)
  goalsFor: number;

  @Field(() => Int)
  goalsAgainst: number;

  @Field(() => Int)
  points: number;
}

// ===============================

@ObjectType()
export class Tournament {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => LeagueFormat)
  format: LeagueFormat;

  @Field(() => TournamentStatus)
  status: TournamentStatus;

  @Field(() => User)
  organizer: User;

  @Field(() => User, { nullable: true })
  planner?: User; // 🔥 AÑADIDO: El planillero ahora pertenece al Torneo (puede ser null al inicio)

  @Field(() => User, { nullable: true })
  staff?: User;

  @Field(() => TournamentSettings, { nullable: true })
  settings?: TournamentSettings;

  @Field(() => [TournamentTeam], { nullable: true })
  teams?: TournamentTeam[];

  @Field(() => [TournamentMatch], { nullable: true })
  matches?: TournamentMatch[];

  @Field(() => [TournamentStanding], { nullable: true })
  standings?: TournamentStanding[];
}

// ===============================
// INPUTS
// ===============================

@InputType()
export class NewOrganizerInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  fullName: string;

  @Field({ nullable: true })
  phone?: string;
}

// ===============================

@InputType()
export class TournamentSettingsInput {
  @Field(() => Int, { nullable: true })
  maxTeams?: number;

  @Field(() => Int, { nullable: true })
  rounds?: number;

  @Field(() => Int, { nullable: true })
  pointsWin?: number;

  @Field(() => Int, { nullable: true })
  pointsDraw?: number;

  @Field(() => Int, { nullable: true })
  pointsLoss?: number;

  @Field({ nullable: true })
  allowDraws?: boolean;

  @Field({ nullable: true })
  hasPlayoffs?: boolean;
}

// ===============================

@InputType()
export class CreateLeagueInput {
  @Field()
  name: string;

  @Field(() => LeagueFormat)
  format: LeagueFormat;

  @Field(() => NewOrganizerInput)
  newOrganizer: NewOrganizerInput;

  @Field(() => TournamentSettingsInput, { nullable: true })
  settings?: TournamentSettingsInput;

  @Field(() => CreateUserInput, { nullable: true })
  planner?: CreateUserInput;

  @Field(() => CreateUserInput, { nullable: true })
  staff?: CreateUserInput;
}

// ===============================

@InputType()
export class CreateTeamInput {
  @Field()
  tournamentId: string;

  @Field()
  name: string;
}

// ===============================

@InputType()
export class CreateTournamentPlayerInput {
  @Field()
  teamId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => Int, { nullable: true })
  number?: number;

  @Field(() => PlayerPosition, { nullable: true })
  position?: PlayerPosition;
}

// ===============================

@InputType()
export class CreateTournamentMatchInput {
  @Field()
  tournamentId: string;

  @Field()
  homeTeamId: string;

  @Field()
  awayTeamId: string;

  // 🔥 ELIMINADO: plannerId ya no es necesario aquí, lo hereda del torneo

  @Field()
  date: Date;

  @Field(() => Int)
  round: number;
}

@InputType()
export class UpdateTournamentMatchInput {
  @Field()
  matchId: string;

  @Field({ nullable: true })
  date?: Date;

  @Field(() => Int, { nullable: true })
  round?: number;

  @Field({ nullable: true })
  homeTeamId?: string;

  @Field({ nullable: true })
  awayTeamId?: string;

  @Field(() => MatchStatus, { nullable: true })
  status?: MatchStatus;
}

@InputType()
export class ValidateMatchResultInput {
  @Field()
  matchId: string;

  @Field(() => Int)
  homeScore: number;

  @Field(() => Int)
  awayScore: number;
}

@InputType()
export class UpdateTournamentSettingsInput {
  @Field()
  tournamentId: string;

  @Field(() => Int, { nullable: true })
  pointsWin?: number;

  @Field(() => Int, { nullable: true })
  pointsDraw?: number;

  @Field(() => Int, { nullable: true })
  pointsLoss?: number;
}

@InputType()
export class LockMatchRosterInput {
  @Field()
  matchId: string;

  @Field(() => [String])
  verifiedHomePlayerIds: string[];

  @Field(() => [String])
  verifiedAwayPlayerIds: string[];

  @Field({ nullable: true })
  allowInsufficientPlayers?: boolean;
}

@InputType()
export class AddMatchEventInput {
  @Field()
  matchId: string;

  @Field(() => MatchTeamSide)
  teamSide: MatchTeamSide;

  @Field(() => MatchEventType)
  type: MatchEventType;

  @Field(() => Int)
  minute: number;

  @Field({ nullable: true })
  playerId?: string;

  @Field({ nullable: true })
  description?: string;
}

@InputType()
export class SubmitMatchSheetInput {
  @Field()
  matchId: string;

  @Field()
  notes: string;
}
