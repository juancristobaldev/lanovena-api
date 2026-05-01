import {
  CreateGlobalNoticeInput,
  GlobalNotice,
  UpdateGlobalNoticeInput,
} from '@/entitys/global-news.entity';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GlobalNewsService } from './global-news.service';
import { Role, TargetAudience } from '@prisma/client';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class GlobalNewsResolver {
  constructor(private readonly globalNewServices: GlobalNewsService) {}
  // 📥 Crear
  @Mutation(() => GlobalNotice)
  @Roles(Role.SUPERADMIN, Role.SUBADMIN, Role.DIRECTOR)
  async createGlobalNotice(@Args('input') input: CreateGlobalNoticeInput) {
    return await this.globalNewServices.create(input);
  }

  // 📄 Obtener todos
  @Query(() => [GlobalNotice])
  @Roles(Role.SUPERADMIN, Role.SUBADMIN, Role.DIRECTOR, Role.COACH, Role.GUARDIAN)
  async globalNotices(
    @Args('targetAudience', { nullable: true }) targetAudience?: TargetAudience,
  ) {
    return await this.globalNewServices.findAll(targetAudience);
  }

  // 📄 Obtener uno
  @Query(() => GlobalNotice)
  @Roles(Role.SUPERADMIN, Role.SUBADMIN, Role.DIRECTOR, Role.COACH, Role.GUARDIAN)
  async globalNotice(@Args('id') id: string) {
    return await this.globalNewServices.findOne(id);
  }

  // ✏️ Actualizar
  @Mutation(() => GlobalNotice)
  @Roles(Role.SUPERADMIN, Role.SUBADMIN, Role.DIRECTOR)
  async updateGlobalNotice(@Args('input') input: UpdateGlobalNoticeInput) {
    const { id, ...data } = input;

    return await this.globalNewServices.update(input);
  }

  // 🗑️ Eliminar
  @Mutation(() => Boolean)
  @Roles(Role.SUPERADMIN, Role.SUBADMIN, Role.DIRECTOR)
  async deleteGlobalNotice(@Args('id') id: string) {
    await this.globalNewServices.remove(id);

    return true;
  }
}
