import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

import { TacticalBoardService } from './tactical-board.service';
import {
  CreateTacticalBoardInput,
  TacticalBoardEntity,
  UpdateTacticalBoardInput,
} from 'src/entitys/tactical-board.entity';
import { UserEntity } from 'src/entitys/user.entity';

@Resolver(() => TacticalBoardEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class TacticalBoardResolver {
  constructor(private readonly boardService: TacticalBoardService) {}

  @Mutation(() => TacticalBoardEntity)
  @Roles(Role.COACH, Role.DIRECTOR)
  createTacticalBoard(
    @Args('input') input: CreateTacticalBoardInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.boardService.create(input, user);
  }

  @Query(() => [TacticalBoardEntity], { name: 'tacticalBoardsByCategory' })
  @Roles(Role.COACH, Role.DIRECTOR)
  findAllByCategory(
    @Args('categoryId', { type: () => ID }) categoryId: string,
  ) {
    return this.boardService.findAllByCategory(categoryId);
  }

  @Query(() => TacticalBoardEntity, { name: 'tacticalBoard' })
  @Roles(Role.COACH, Role.DIRECTOR)
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.boardService.findOne(id);
  }

  @Mutation(() => TacticalBoardEntity)
  @Roles(Role.COACH, Role.DIRECTOR)
  updateTacticalBoard(@Args('input') input: UpdateTacticalBoardInput) {
    return this.boardService.update(input.id, input);
  }

  @Mutation(() => TacticalBoardEntity)
  @Roles(Role.COACH, Role.DIRECTOR)
  removeTacticalBoard(@Args('id', { type: () => ID }) id: string) {
    return this.boardService.remove(id);
  }
}
