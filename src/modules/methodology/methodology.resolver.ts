import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { TestProtocolsService } from './test-protocols/test-protocols.service';
import { TacticalBoardsService } from './tactical-boards/tactical-boards.service';
import {
  CreateTacticalBoardInput,
  CreateTestProtocolInput,
  TacticalBoard,
  TestProtocol,
  UpdateTacticalBoardInput,
} from 'src/entitys/methodology.entity';

@Resolver()
@UseGuards(GqlAuthGuard)
export class MethodologyResolver {
  constructor(
    private readonly testProtocolsService: TestProtocolsService,
    private readonly tacticalBoardsService: TacticalBoardsService,
  ) {}

  // ============================
  // QUERIES
  // ============================

  @Query(() => [TestProtocol], {
    description: 'Lista de tests estandarizados globales',
  })
  async globalTestProtocols() {
    return this.testProtocolsService.findAll();
  }

  @Query(() => [TacticalBoard], {
    description: 'Pizarras creadas por el usuario actual',
  })
  async myTacticalBoards(@CurrentUser() user: User) {
    return this.tacticalBoardsService.findAllByUser(user.id);
  }

  // ============================
  // MUTATIONS (TESTS)
  // ============================

  @Mutation(() => TestProtocol)
  async createTestProtocol(@Args('input') input: CreateTestProtocolInput) {
    // TODO: Agregar validación de Rol SUPERADMIN aquí si se requiere
    return this.testProtocolsService.create(input);
  }

  // ============================
  // MUTATIONS (PIZARRAS)
  // ============================

  @Mutation(() => TacticalBoard)
  async saveTacticalBoard(
    @CurrentUser() user: User,
    @Args('input') input: CreateTacticalBoardInput,
  ) {
    return this.tacticalBoardsService.create(user.id, input);
  }

  @Mutation(() => TacticalBoard)
  async updateTacticalBoard(
    @CurrentUser() user: User,
    @Args('input') input: UpdateTacticalBoardInput,
  ) {
    return this.tacticalBoardsService.update(user.id, input);
  }

  @Mutation(() => TacticalBoard)
  async deleteTacticalBoard(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.tacticalBoardsService.delete(user.id, id);
  }
}
