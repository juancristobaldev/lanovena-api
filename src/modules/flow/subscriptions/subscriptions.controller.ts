import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';

import { User, Role, SubscriptionSaleStatus, SubscriptionSaleType } from '@prisma/client';
import { FlowApiException, FlowService } from '../flow.service';
import { PrismaService } from '../../../modules/prisma/prisma.service';
import { HttpAuthGuard } from '../../../auth/guards/http-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

@Controller('flow/subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly flowService: FlowService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * PASO 1: Registrar Tarjeta
   * Inicia el proceso para que el Director inscriba su tarjeta en Flow.
   * Retorna la URL de redirección a Flow.
   */
  @Post('register-card')
  @UseGuards(HttpAuthGuard)
  async registerCard(@CurrentUser() user: User) {
    // 1. Validar que sea Director
    if (user.role !== Role.DIRECTOR && user.role !== Role.SUPERADMIN) {
      throw new BadRequestException(
        'Solo el Director puede gestionar la suscripción',
      );
    }

    const director = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
        flowCustomerId: true,
      },
    });

    if (!director) {
      throw new InternalServerErrorException('Director no encontrado');
    }

    if (!director.fullName?.trim()) {
      throw new BadRequestException('El director no tiene nombre configurado');
    }

    if (!director.email?.trim()) {
      throw new BadRequestException('El director no tiene email configurado');
    }

    // 2. Definir externalId local e intentar resolver customerId real en Flow
    const externalId = `director_${director.id}`;
    const isLegacyExternalId = director.flowCustomerId === externalId;
    let flowCustomerId = !isLegacyExternalId ? director.flowCustomerId : null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        flowCardStatus: 'PENDING',
      },
    });

    try {
      if (!flowCustomerId) {
        const createdCustomer = await this.flowService.createCustomer(
          director.fullName,
          director.email,
          externalId,
        );

        const createdCustomerId = this.flowService.extractCustomerId(createdCustomer);
        if (!createdCustomerId) {
          throw new BadRequestException(
            'Flow no devolvió customerId al crear el cliente',
          );
        }

        flowCustomerId = createdCustomerId;

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            flowCustomerId,
          },
        });
      }

      // 4. Solicitar registro de tarjeta
      const response = await this.flowService.registerCustomerCard(flowCustomerId);

      return {
        redirectUrl: response.redirectUrl,
        token: response.token,
      };
    } catch (error: any) {
      await this.prisma.user.update({
        where: { id: director.id },
        data: {
          flowCardStatus: 'FAILED',
          flowSubscriptionStatus: null,
          flowLastToken: null,
        },
      });

      this.logger.error(
        `Flow register-card rollback for ${director.id}: ${error.message}`,
      );

      if (error instanceof FlowApiException) {
        throw new BadRequestException(
          `No se pudo iniciar el registro en Flow: ${error.flowMessage}`,
        );
      }

      throw new BadRequestException(
        'No se pudo iniciar el registro de tarjeta en Flow',
      );
    }
  }

  /**
   * PASO 3: Crear la Suscripción (Activar Plan)
   * Se llama DESPUÉS de que el webhook de 'register-card' confirma que la tarjeta está lista.
   */
  @Post('create')
  @UseGuards(HttpAuthGuard)
  async createSubscription(
    @CurrentUser() user: User,
    @Body('planLimitId') planLimitId: string,
    @Body('billingCycle') billingCycle: 'mensual' | 'anual' = 'mensual',
  ) {
    if (user.role !== Role.DIRECTOR && user.role !== Role.SUPERADMIN) {
      throw new BadRequestException(
        'Solo el Director puede gestionar la suscripción',
      );
    }

    const director = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!director) {
      throw new InternalServerErrorException('Director no encontrado');
    }

    if (!director.flowCustomerId) {
      throw new BadRequestException('Primero registra una tarjeta en Flow');
    }

    if (director.flowCardStatus !== 'REGISTERED') {
      throw new BadRequestException(
        'La tarjeta aún no está registrada o validada',
      );
    }

    // Validar que la tarjeta esté registrada (esto lo actualizó el webhook previamente)
    // Asumimos que guardaste un flag 'hasCard' o verificas el estado
    // if (!school.hasPaymentMethod) throw new BadRequestException('Primero registra una tarjeta');

    if (!planLimitId) {
      throw new BadRequestException('Debes indicar planLimitId');
    }

    const plan = await this.prisma.planLimit.findUnique({
      where: { id: planLimitId },
      select: {
        id: true,
        name: true,
        amount: true,
        flowId: true,
        flowIdYearly: true,
        isActive: true,
      },
    });

    if (!plan || !plan.isActive) {
      throw new BadRequestException('Plan no válido o inactivo');
    }

    const flowPlanId = billingCycle === 'anual' ? plan.flowIdYearly : plan.flowId;

    if (!flowPlanId) {
      throw new BadRequestException(
        `El plan ${plan.name} no tiene Flow ID para ${billingCycle}`,
      );
    }

    const flowCustomerId = director.flowCustomerId;

    try {
      // Crear suscripción en Flow
      const subscription = await this.flowService.createSubscription({
        customerId: flowCustomerId,
        planId: flowPlanId,
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: director.id },
          data: {
            planLimitId,
            flowPlanId: flowPlanId,
            flowSubscriptionId: subscription.subscriptionId,
            flowSubscriptionStatus: 'ACTIVE',
            flowLastToken: null,
          },
        });

        await tx.subscriptionSale.create({
          data: {
            directorId: director.id,
            planLimitId: plan.id,
            flowSubscriptionId: subscription.subscriptionId ?? null,
            flowToken: subscription.token ?? null,
            flowOrder:
              subscription.flowOrder != null
                ? String(subscription.flowOrder)
                : null,
            amount: plan.amount,
            currency: 'CLP',
            billingCycle,
            periodKey: new Date().toISOString().slice(0, 7),
            saleType: SubscriptionSaleType.INITIAL,
            status: SubscriptionSaleStatus.PENDING,
            payload: subscription,
          },
        });
      });

      return { success: true, subscription };
    } catch (error) {
      this.logger.error(`Error creando suscripción: ${error.message}`);
      throw new BadRequestException(
        'No se pudo activar la suscripción. Verifica tu tarjeta.',
      );
    }
  }
}
