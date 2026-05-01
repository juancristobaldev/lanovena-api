import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';

import { TestProtocolsService } from './test-protocols/test-protocols.service';
import {
  CreateTestProtocolInput,
  TestProtocolEntity,
  UpdateTestProtocolInput,
} from '../../entitys/methodology.entity';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';

@Resolver()
@UseGuards(GqlAuthGuard)
export class MethodologyResolver {
  constructor(private readonly testProtocolsService: TestProtocolsService) {}

  // ============================
  // QUERIES
  // ============================
  @Query(() => [TestProtocolEntity])
  async getAvailableTestProtocols() {
    return this.testProtocolsService.findAllGlobals();
  }

  // ============================
  // MUTATIONS (TESTS)
  // ============================

  @Mutation(() => TestProtocolEntity)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async createTestProtocol(@Args('input') input: CreateTestProtocolInput) {
    // TODO: Agregar validación de Rol SUPERADMIN aquí si se requiere
    return this.testProtocolsService.create(input);
  }
  @Mutation(() => TestProtocolEntity)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async updateTestProtocol(
    @Args('id') id: string,
    @Args('input') input: UpdateTestProtocolInput,
  ) {
    // TODO: Agregar validación de Rol SUPERADMIN aquí si se requiere
    return this.testProtocolsService.update(id, input);
  }
  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async deleteTestProtocol(@Args('id') id: string) {
    // TODO: Agregar validación de Rol SUPERADMIN aquí si se requiere
    return this.testProtocolsService.delete(id);
  }

  // ============================
  // MUTATIONS (PIZARRAS)
  // ============================
}
