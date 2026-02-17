import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

// Guards y Decoradores de tu sistema de Auth
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  CreateMatchInput,
  MatchEntity,
  UpdateMatchInput,
} from '../../entitys/match.entity';
import { Role } from '@prisma/client';
import { CategoryEntity } from '../../entitys/category.entity';
import { MatchService } from './match.service';

@Resolver(() => MatchEntity)
@UseGuards(GqlAuthGuard) // Protege todo el resolver
export class MatchResolver {
  constructor(private readonly matchesService: MatchService) {}

  // --- MUTATIONS ---

  @Mutation(() => MatchEntity)
  @Roles(Role.DIRECTOR, Role.COACH) // Solo Directores y Entrenadores
  createMatch(
    @Args('input') createMatchInput: CreateMatchInput,
    @Context() context: any,
  ) {
    return this.matchesService.create(createMatchInput, context.req.user);
  }

  @Mutation(() => MatchEntity)
  @Roles(Role.DIRECTOR, Role.COACH)
  updateMatch(@Args('input') updateMatchInput: UpdateMatchInput) {
    return this.matchesService.update(updateMatchInput.id, updateMatchInput);
  }

  @Mutation(() => MatchEntity)
  @Roles(Role.DIRECTOR) // Quizás solo el director puede borrar historiales
  removeMatch(@Args('id', { type: () => ID }) id: string) {
    return this.matchesService.remove(id);
  }

  // --- QUERIES ---

  @Query(() => [MatchEntity], { name: 'matches' })
  findAllMatches() {
    return this.matchesService.findAll();
  }

  @Query(() => [MatchEntity], { name: 'matchesByCategory' })
  findMatchesByCategory(
    @Args('categoryId', { type: () => ID }) categoryId: string,
  ) {
    return this.matchesService.findAllByCategory(categoryId);
  }

  @Query(() => MatchEntity, { name: 'match' })
  findOneMatch(@Args('id', { type: () => ID }) id: string) {
    return this.matchesService.findOne(id);
  }

  // --- FIELD RESOLVERS ---
  // Esto permite pedir { match { category { name } } } de forma eficiente
  @ResolveField(() => CategoryEntity)
  category(@Parent() match: MatchEntity) {
    // Si el servicio ya trajo la categoría (vía include), la devolvemos.
    if (match.category) return match.category;

    // Si no, aquí podrías llamar a un categoriesService.findOne(match.categoryId)
    // Pero como usamos 'include' en el servicio, esto es redundante pero seguro.
    return { __typename: 'CategoryEntity', id: match.categoryId };
  }
}
