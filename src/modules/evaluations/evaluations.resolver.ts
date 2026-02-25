import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { EvaluationsService } from './evaluations.service';
import {
  EvaluationEntity,
  CreateEvaluationInput,
} from '../../entitys/evaluation.entity';
import { TestProtocolEntity } from '@/entitys/methodology.entity';
import { TestProtocolsService } from '../methodology/test-protocols/test-protocols.service';

@Resolver(() => EvaluationEntity)
export class EvaluationsResolver {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Mutation(() => EvaluationEntity)
  async createEvaluation(
    @Args('createEvaluationInput') input: CreateEvaluationInput,
  ) {
    return this.evaluationsService.create(input);
  }

  @Query(() => [EvaluationEntity])
  async getPlayerEvaluations(@Args('playerId') playerId: string) {
    return this.evaluationsService.findAllByPlayer(playerId);
  }
}
