import { Resolver, Query, Mutation, Args, Context, ID } from '@nestjs/graphql';
import {
  UseGuards,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from 'src/entitys/user.entity';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UsersService } from './users.service';

@Resolver(() => UserEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  /* ===========================================================================
   * MUTATIONS
   * =========================================================================== */

  /* ===========================================================================
   * MUTATIONS
   * =========================================================================== */

  @Mutation(() => UserEntity)
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  createUser(@Args('input') input: CreateUserInput, @Context() context: any) {
    return this.usersService.createUser(input as any, context.user);
  }

  @Mutation(() => UserEntity)
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  updateUser(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('input') input: UpdateUserInput,
    @Context() context: any,
  ) {
    return this.usersService.updateUser(userId, input as any, context.user);
  }

  @Mutation(() => Boolean)
  @Roles(Role.SUPERADMIN)
  deactivateUser(@Args('userId', { type: () => ID }) userId: string) {
    return this.usersService.deactivateUser(userId);
  }

  /* ===========================================================================
   * QUERIES
   * =========================================================================== */

  @Query(() => [UserEntity])
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  users(@Context() context: any) {
    return this.usersService.findAll(context.user);
  }

  @Query(() => UserEntity)
  me(@Context() context: any) {
    return context.user;
  }

  @Query(() => UserEntity)
  @Roles(Role.SUPERADMIN, Role.DIRECTOR)
  userById(
    @Args('userId', { type: () => ID }) userId: string,
    @Context() context: any,
  ) {
    return this.usersService.findById(userId, context.user);
  }

  @Query(() => [UserEntity])
  @Roles(Role.DIRECTOR)
  coaches(@Context() context: any) {
    return this.usersService.findCoaches(context.user.schoolId);
  }

  @Query(() => [UserEntity])
  @Roles(Role.DIRECTOR, Role.COACH)
  guardians(@Context() context: any) {
    return this.usersService.findGuardians(context.user.schoolId);
  }
}
