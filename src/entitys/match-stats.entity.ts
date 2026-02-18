import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { MatchEntity } from './match.entity';
import { PlayerEntity } from './player.entity';

@ObjectType()
export class MatchStatEntity {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  goals: number;

  @Field(() => Int)
  assists: number;

  @Field(() => String)
  matchId: string;

  @Field(() => String)
  playerId: string;

  // RELACIONES
  @Field(() => MatchEntity)
  match: MatchEntity;

  @Field(() => PlayerEntity)
  player: PlayerEntity;
}
