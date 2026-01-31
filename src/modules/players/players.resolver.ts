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
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserEntity } from 'src/entitys/user.entity';

@Resolver(() => PlayerEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class PlayersResolver {
  constructor(private readonly playersService: PlayersService) {}

  /* ===================== MUTATIONS ===================== */

  @Roles(Role.DIRECTOR)
  @Mutation(() => PlayerEntity)
  createPlayer(
    @Args('input') input: CreatePlayerInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.playersService.create(input, user);
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
