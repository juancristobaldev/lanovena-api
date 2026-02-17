import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';

import { User, Role } from '@prisma/client';
import { FlowService } from '../flow.service';
import { PrismaService } from '../../../modules/prisma/prisma.service';
import { GqlAuthGuard } from '../../../auth/guards/gql-auth.guard';
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
  @UseGuards(GqlAuthGuard)
  async registerCard(@CurrentUser() user: User) {
    // 1. Validar que sea Director
    if (user.role !== Role.DIRECTOR && user.role !== Role.SUPERADMIN) {
      throw new BadRequestException(
        'Solo el Director puede gestionar la suscripción',
      );
    }

    if (!user.schoolId)
      throw new InternalServerErrorException('no esta asociado a una escuela');
    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId },
    });
    if (!school) throw new BadRequestException('Escuela no encontrada');

    // 2. Definir ID de Cliente para Flow (Usamos el ID de la escuela)
    const flowCustomerId = `school_${school.id}`;

    // 3. Crear o Actualizar Cliente en Flow
    // Intentamos crearlo; si ya existe, Flow suele manejarlo o podemos ignorar el error específico
    try {
      await this.flowService.createCustomer(
        school.name,
        user.email,
        flowCustomerId,
      );
    } catch (error) {
      this.logger.warn(
        `Cliente Flow ${flowCustomerId} ya existía o error menor: ${error.message}`,
      );
    }

    // 4. Solicitar registro de tarjeta
    // Esto devuelve el token y la URL a donde enviar al usuario
    const response =
      await this.flowService.registerCustomerCard(flowCustomerId);

    return {
      redirectUrl: response.redirectUrl, // Frontend redirige aquí
      token: response.token,
    };
  }

  /**
   * PASO 3: Crear la Suscripción (Activar Plan)
   * Se llama DESPUÉS de que el webhook de 'register-card' confirma que la tarjeta está lista.
   */
  @Post('create')
  @UseGuards(GqlAuthGuard)
  async createSubscription(
    @CurrentUser() user: User,
    @Body('planType') planType: string, // 'SEMILLERO', 'PROFESIONAL', 'ALTO_RENDIMIENTO'
  ) {
    if (!user.schoolId)
      throw new InternalServerErrorException('no esta asociado a una escuela');
    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId },
    });

    // Validar que la tarjeta esté registrada (esto lo actualizó el webhook previamente)
    // Asumimos que guardaste un flag 'hasCard' o verificas el estado
    // if (!school.hasPaymentMethod) throw new BadRequestException('Primero registra una tarjeta');

    // Mapeo de IDs de Planes en Flow
    const FLOW_PLAN_IDS = {
      SEMILLERO: 'plan_semillero_v1',
      PROFESIONAL: 'plan_pro_v1',
      ALTO_RENDIMIENTO: 'plan_elite_v1',
    };

    const flowPlanId = FLOW_PLAN_IDS[planType];
    if (!flowPlanId) throw new BadRequestException('Tipo de plan no válido');

    if (!school?.id)
      throw new InternalServerErrorException('no existe escuela');

    const flowCustomerId = `school_${school.id}`;

    try {
      // Crear suscripción en Flow
      const subscription = await this.flowService.createSubscription({
        customerId: flowCustomerId,
        planId: flowPlanId,
      });

      // Actualizar DB Local
      await this.prisma.school.update({
        where: { id: school.id },
        data: {
          planType: planType as any,
          subscriptionStatus: 'ACTIVE',
          // Guardamos ID de suscripción por si queremos cancelarla luego
          // subscriptionId: subscription.subscriptionId
        },
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
