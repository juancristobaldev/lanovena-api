import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CategoriesService } from './categories.service';
import {
  CategoryEntity,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../../entitys/category.entity';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserEntity } from '../../entitys/user.entity';

@Resolver(() => CategoryEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  /* ===========================================================================
   * MUTATIONS
   * =========================================================================== */

  @Mutation(() => CategoryEntity)
  @Roles(Role.DIRECTOR, Role.SUPERADMIN)
  createCategory(
    @Args('input') input: CreateCategoryInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.categoriesService.create(input, user);
  }

  @Mutation(() => CategoryEntity)
  @Roles(Role.DIRECTOR, Role.SUPERADMIN)
  updateCategory(
    @Args('id') id: string,
    @Args('input') input: UpdateCategoryInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.categoriesService.update(id, input, user);
  }

  @Mutation(() => CategoryEntity)
  @Roles(Role.DIRECTOR, Role.SUPERADMIN)
  removeCategory(@Args('id') id: string, @CurrentUser() user: UserEntity) {
    return this.categoriesService.remove(id, user);
  }

  /* ===========================================================================
   * QUERIES
   * =========================================================================== */

  @Query(() => [CategoryEntity])
  @Roles(Role.DIRECTOR, Role.COACH, Role.SUPERADMIN)
  categories(
    @CurrentUser() user: UserEntity,
    @Args('schoolId', { nullable: true }) schoolId?: string,
  ) {
    // Si envían schoolId (ej. SuperAdmin viendo una escuela), se usa ese.
    // Si no, se usa el schoolId del usuario logueado.
    const targetSchoolId = schoolId || user.schoolId;

    if (!targetSchoolId) {
      throw new Error('School ID es requerido');
    }

    return this.categoriesService.findAll(targetSchoolId);
  }

  @Query(() => CategoryEntity)
  @Roles(Role.DIRECTOR, Role.COACH, Role.SUPERADMIN)
  category(@Args('id') id: string, @Context() context: any) {
    return this.categoriesService.findOne(id, context.user);
  }
}
