import { Module } from '@nestjs/common';
import { PlayersService } from './players.service';
import { PlayersResolver } from './players.resolver';

@Module({
  providers: [PlayersService, PlayersResolver]
})
export class PlayersModule {}
