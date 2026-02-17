import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';

import { TestProtocolsService } from './test-protocols/test-protocols.service';
import {
  CreateTestProtocolInput,
  TestProtocol,
} from '../../entitys/methodology.entity';

@Resolver()
@UseGuards(GqlAuthGuard)
export class MethodologyResolver {
  constructor(private readonly testProtocolsService: TestProtocolsService) {}

  // ============================
  // QUERIES
  // ============================

  @Query(() => [TestProtocol], {
    description: 'Lista de tests estandarizados globales',
  })
  async globalTestProtocols() {
    return this.testProtocolsService.findAll();
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
}
