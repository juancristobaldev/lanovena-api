import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  CreatePlayerInput,
  PlayerEntity,
  UpdatePlayerInput,
} from 'src/entitys/player.entity';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PlayersService } from './players.service';

@Resolver(() => PlayerEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class PlayersResolver {
  constructor(private readonly playersService: PlayersService) {}

  /* ===================== MUTATIONS ===================== */

  @Roles(Role.DIRECTOR)
  @Mutation(() => PlayerEntity)
  createPlayer(
    @Args('input') input: CreatePlayerInput,
    @Context() context: any,
  ) {
    return this.playersService.create(input, context.user);
  }

  @Roles(Role.DIRECTOR)
  @Mutation(() => PlayerEntity)
  updatePlayer(
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('input') input: UpdatePlayerInput,
    @Context() context: any,
  ) {
    return this.playersService.update(playerId, input, context.user);
  }

  @Roles(Role.DIRECTOR)
  @Mutation(() => PlayerEntity)
  togglePlayerActive(
    @Args('playerId', { type: () => ID }) playerId: string,
    @Context() context: any,
  ) {
    return this.playersService.toggleActive(playerId, context.user);
  }

  /* ===================== QUERIES ===================== */

  @Roles(Role.COACH)
  @Query(() => [PlayerEntity])
  playersByCategory(
    @Args('categoryId', { type: () => ID }) categoryId: string,
    @Context() context: any,
  ) {
    return this.playersService.findByCategory(
      categoryId,
      context.user.schoolId,
    );
  }

  @Roles(Role.GUARDIAN)
  @Query(() => [PlayerEntity])
  playersByGuardian(
    @Args('guardianId', { type: () => ID }) guardianId: string,
    @Context() context: any,
  ) {
    return this.playersService.findByGuardian(guardianId, context.user);
  }

  @Roles(Role.GUARDIAN)
  @Query(() => PlayerEntity)
  playerProfile(
    @Args('playerId', { type: () => ID }) playerId: string,
    @Context() context: any,
  ) {
    return this.playersService.findProfile(playerId, context.user);
  }

  @Roles(Role.COACH)
  @Query(() => PlayerEntity)
  scanQrPlayer(
    @Args('qrCodeToken') qrCodeToken: string,
    @Context() context: any,
  ) {
    return this.playersService.scanQr(qrCodeToken, context.user.schoolId);
  }
}
