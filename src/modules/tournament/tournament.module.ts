import { Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { TournamentResolver } from './tournament.resolver';

@Module({
  providers: [TournamentService, TournamentResolver]
})
export class TournamentModule {}
