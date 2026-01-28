import { Resolver, Mutation, Query, Args, Context, ID } from '@nestjs/graphql';
import {
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductEntity } from 'src/entitys/product.entity';
import {
  CreateProductInput,
  UpdateProductInput,
} from 'src/entitys/product.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Resolver(() => ProductEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  /* ===========================================================================
   * MUTATIONS (ADMINISTRACIÓN)
   * =========================================================================== */

  @Mutation(() => ProductEntity)
  @Roles(Role.DIRECTOR)
  async createProduct(
    @Args('input') input: CreateProductInput,
    @Context() context: any,
  ) {
    const user = context.user;

    if (user.schoolId !== input.schoolId) {
      throw new ForbiddenException(
        'No puedes crear productos para otra escuela',
      );
    }

    return this.productsService.create(input);
  }

  @Mutation(() => ProductEntity)
  @Roles(Role.DIRECTOR)
  async updateProduct(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('input') input: UpdateProductInput,
    @Context() context: any,
  ) {
    const product = await this.productsService.findOne(productId);

    if (!product) throw new NotFoundException('Producto no encontrado');

    if (product.schoolId !== context.user.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return this.productsService.update(productId, input);
  }

  @Mutation(() => ProductEntity)
  @Roles(Role.DIRECTOR)
  async removeProduct(
    @Args('productId', { type: () => ID }) productId: string,
    @Context() context: any,
  ) {
    const product = await this.productsService.findOne(productId);

    if (!product) throw new NotFoundException('Producto no encontrado');

    if (product.schoolId !== context.user.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return this.productsService.remove(productId);
  }

  /* ===========================================================================
   * QUERIES
   * =========================================================================== */

  // Vista administrativa (stock completo)
  @Query(() => [ProductEntity])
  @Roles(Role.COACH)
  productsBySchool(@Context() context: any) {
    return this.productsService.findAllBySchool(context.user.schoolId, false);
  }

  // Vista tienda (solo activos + stock)
  @Query(() => [ProductEntity])
  @Roles(Role.GUARDIAN)
  activeProducts(@Context() context: any) {
    return this.productsService.findAllBySchool(context.user.schoolId, true);
  }

  @Query(() => ProductEntity)
  @Roles(Role.COACH)
  async product(
    @Args('productId', { type: () => ID }) productId: string,
    @Context() context: any,
  ) {
    const product = await this.productsService.findOne(productId);

    if (!product) throw new NotFoundException('Producto no encontrado');

    if (product.schoolId !== context.user.schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return product;
  }
}
