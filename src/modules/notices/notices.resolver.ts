import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { NoticesService } from './notices.service';
import {
  NoticeEntity,
  CreateNoticeInput,
  UpdateNoticeInput,
} from 'src/entitys/notice.entity';

@Resolver(() => NoticeEntity)
@UseGuards(GqlAuthGuard, RolesGuard)
export class NoticesResolver {
  constructor(private readonly noticesService: NoticesService) {}

  @Roles(Role.DIRECTOR, Role.COACH, Role.GUARDIAN)
  @Query(() => [NoticeEntity])
  notices(@Args('schoolId', { type: () => ID }) schoolId: string) {
    return this.noticesService.findAllBySchool(schoolId);
  }

  @Roles(Role.DIRECTOR, Role.COACH, Role.GUARDIAN)
  @Query(() => NoticeEntity)
  notice(
    @Args('id', { type: () => ID }) id: string,
    @Args('schoolId', { type: () => ID }) schoolId: string,
  ) {
    return this.noticesService.findOne(id, schoolId);
  }

  @Roles(Role.DIRECTOR)
  @Mutation(() => NoticeEntity)
  createNotice(@Args('input') input: CreateNoticeInput) {
    return this.noticesService.create(input);
  }

  @Roles(Role.DIRECTOR)
  @Mutation(() => NoticeEntity)
  updateNotice(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateNoticeInput,
  ) {
    return this.noticesService.update(id, input);
  }

  @Roles(Role.DIRECTOR)
  @Mutation(() => NoticeEntity)
  deleteNotice(@Args('id', { type: () => ID }) id: string) {
    return this.noticesService.remove(id);
  }
}
