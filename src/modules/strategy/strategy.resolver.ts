import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { StrategyService } from './strategy.service';

// Importaciones de tu Auth System existente
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserEntity } from '../../entitys/user.entity';
import {
  CreateStrategyInput,
  Strategy,
  UpdateStrategyInput,
} from '../../entitys/strategy.entity';

@Resolver(() => Strategy)
@UseGuards(GqlAuthGuard) // Protege todas las rutas de este resolver
export class StrategyResolver {
  constructor(private readonly strategyService: StrategyService) {}

  @Mutation(() => Strategy)
  createStrategy(
    @CurrentUser() user: UserEntity,
    @Args('createStrategyInput') createStrategyInput: CreateStrategyInput,
  ) {
    return this.strategyService.create(user.id, createStrategyInput);
  }

  @Query(() => [Strategy], { name: 'myStrategies' })
  findAll(@CurrentUser() user: UserEntity) {
    return this.strategyService.findAllByUser(user.id);
  }

  @Query(() => Strategy, { name: 'strategy' })
  findOne(
    @CurrentUser() user: UserEntity,
    @Args('id', { type: () => String }) id: string,
  ) {
    return this.strategyService.findOne(id, user.id);
  }

  @Mutation(() => Strategy)
  updateStrategy(
    @CurrentUser() user: UserEntity,
    @Args('updateStrategyInput') updateStrategyInput: UpdateStrategyInput,
  ) {
    return this.strategyService.update(user.id, updateStrategyInput);
  }

  @Mutation(() => Strategy)
  removeStrategy(
    @CurrentUser() user: UserEntity,
    @Args('id', { type: () => String }) id: string,
  ) {
    return this.strategyService.remove(id, user.id);
  }
}
