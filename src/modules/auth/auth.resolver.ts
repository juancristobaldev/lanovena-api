import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

import { User as PrismaUser } from '@prisma/client';
import { UserEntity } from '../../entitys/user.entity';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  AuthResponse,
  LoginInput,
  OnboardingStepInput,
  RegisterInput,
} from '../../entitys/auth.entity';
import { PrismaService } from '../prisma/prisma.service';

@Resolver(() => AuthResponse)
export class AuthResolver {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  // --- PÚBLICO ---

  @Mutation(() => AuthResponse, {
    description: 'Inicio de sesión unificado (Director, Coach, Admin)',
  })
  async login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    return this.authService.login(input);
  }

  @Mutation(() => AuthResponse, {
    description: 'Registro de nueva cuenta (Generalmente para Directores)',
  })
  async register(@Args('input') input: RegisterInput): Promise<AuthResponse> {
    return this.authService.register(input);
  }

  @Query(() => Boolean, {
    description: 'Verifica si un correo está disponible para registro',
  })
  async isEmailAvailable(@Args('email') email: string): Promise<boolean> {
    return this.authService.isEmailAvailable(email);
  }

  // --- PROTEGIDO ---

  @Query(() => UserEntity, {
    description: 'Retorna el usuario actualmente autenticado (Perfil)',
  })
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: PrismaUser) {
    const auth = await this.prisma.user.findUnique({
      where: { id: user?.id },
      include: {
        schools: {
          include: {
            school: {
              include: {
                products: true,
              },
            },
          },
        },
      },
    });

    return auth;
  }

  @Mutation(() => AuthResponse, {
    description: '👑 GOD MODE: SuperAdmin inicia sesión como otro usuario',
  })
  @UseGuards(GqlAuthGuard)
  async impersonateUser(
    @CurrentUser() admin: PrismaUser,
    @Args('targetUserId') targetUserId: string,
  ): Promise<AuthResponse> {
    // La validación de rol SUPERADMIN se hace dentro del servicio
    return this.authService.impersonate(admin.id, targetUserId);
  }

  @Mutation(() => Boolean, {
    description: 'Actualiza el paso del wizard de onboarding',
  })
  @UseGuards(GqlAuthGuard)
  async updateOnboardingStep(
    @CurrentUser() user: PrismaUser,
    @Args('input') input: OnboardingStepInput,
  ): Promise<boolean> {
    await this.authService.updateOnboardingStep(user.id, input.step);
    return true;
  }
}
