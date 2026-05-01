import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Logger,
  BadRequestException,
  HttpCode,
  Res,
} from '@nestjs/common';
import { FlowService } from './flow.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role, SubscriptionSaleStatus, SubscriptionSaleType } from '@prisma/client';
import { Response } from 'express';

@Controller('flow/hooks')
export class FlowController {
  private readonly logger = new Logger(FlowController.name);

  constructor(
    private readonly flowService: FlowService,
    private readonly prisma: PrismaService,
  ) {}

  private redirectCardReturn(token: string | undefined, res: Response) {
    const frontendUrl =
      process.env.ENDPOINT_FRONTEND || 'http://localhost:3000';

    const callbackUrl = token
      ? `${frontendUrl}/flow/callback-register-card?token=${encodeURIComponent(token)}`
      : `${frontendUrl}/flow/callback-register-card`;

    return res.redirect(callbackUrl);
  }

  @Post('card-return')
  @HttpCode(302)
  cardReturnPost(@Body('token') token: string, @Res() res: Response) {
    return this.redirectCardReturn(token, res);
  }

  @Get('card-return')
  cardReturnGet(@Query('token') token: string, @Res() res: Response) {
    return this.redirectCardReturn(token, res);
  }

  /**
   * WEBHOOK 1: Validación de Registro de Tarjeta
   * * Flow NO envía una notificación server-to-server automática para el registro de tarjetas
   * en todos los casos. Usualmente redirige al usuario al 'url_return'.
   * * Este endpoint debe ser llamado por tu Frontend cuando recibe el retorno de Flow,
   * O configurado como el 'url_return' si manejas redirección backend.
   */
  @Post('card-registered')
  async validateCardRegistration(@Body('token') token: string) {
    if (!token) throw new BadRequestException('Token requerido');

    try {
      const existingEvent = await this.prisma.flowWebhookEvent.findUnique({
        where: { token },
      });

      if (existingEvent?.status === 'PROCESSED') {
        return { success: true, message: 'Token ya procesado' };
      }

      if (!existingEvent) {
        await this.prisma.flowWebhookEvent.create({
          data: {
            token,
            eventType: 'CARD_REGISTERED',
            status: 'RECEIVED',
          },
        });
      }

      // Consultar estado a Flow
      const status = await this.flowService.getRegisterStatus(token);

      // Status 1 = Tarjeta Inscrita Exitosamente
      if (Number(status.status) === 1) {
        const flowCustomerId = status.customerId;
        const director = await this.prisma.user.findFirst({
          where: {
            flowCustomerId,
            role: Role.DIRECTOR,
          },
        });

        if (!director) {
          throw new BadRequestException(
            `No existe director para flowCustomerId ${flowCustomerId}`,
          );
        }

        await this.prisma.user.update({
          where: { id: director.id },
          data: {
            flowCardStatus: 'REGISTERED',
            flowCardLast4: status.last4CardDigits ?? null,
            flowCardType: status.creditCardType ?? null,
            flowLastToken: token,
          },
        });

        await this.prisma.flowWebhookEvent.update({
          where: { token },
          data: {
            directorId: director.id,
            payload: status,
            status: 'PROCESSED',
            processedAt: new Date(),
          },
        });

        this.logger.log(
          `Tarjeta registrada exitosamente para director ${director.id}`,
        );
        return { success: true, message: 'Tarjeta validada' };
      } else {
        await this.prisma.flowWebhookEvent.update({
          where: { token },
          data: {
            payload: status,
            status: 'FAILED',
            error: 'Registro de tarjeta no exitoso',
            processedAt: new Date(),
          },
        });

        throw new BadRequestException(
          'El registro de la tarjeta no fue exitoso',
        );
      }
    } catch (error) {
      this.logger.error(`Error validando tarjeta: ${error.message}`);

      await this.prisma.flowWebhookEvent.upsert({
        where: { token },
        update: {
          status: 'FAILED',
          error: error.message,
          processedAt: new Date(),
        },
        create: {
          token,
          eventType: 'CARD_REGISTERED',
          status: 'FAILED',
          error: error.message,
          processedAt: new Date(),
        },
      });

      throw new BadRequestException(
        'Error al validar el registro de la tarjeta',
      );
    }
  }

  /**
   * WEBHOOK 2: Pagos de Suscripción (Recurrente)
   * Flow llamará a este endpoint automáticamente cada vez que se cobre una mensualidad del plan.
   * Debes configurar esta URL en tu cuenta de Flow como "URL de confirmación".
   */
  @Post('subscription-pay')
  @HttpCode(200) // Importante: Responder 200 OK rápido
  async handleSubscriptionPayment(@Body() body: any) {
    // Flow envía el token en el body (form-data o json)
    const token = body.token;

    if (!token) {
      // Si no hay token, ignoramos (a veces llegan pings de prueba)
      return;
    }

    try {
      const existingEvent = await this.prisma.flowWebhookEvent.findUnique({
        where: { token },
      });

      if (existingEvent?.status === 'PROCESSED') {
        return;
      }

      if (!existingEvent) {
        await this.prisma.flowWebhookEvent.create({
          data: {
            token,
            eventType: 'SUBSCRIPTION_PAYMENT',
            status: 'RECEIVED',
          },
        });
      }

      const paymentStatus = await this.flowService.getPaymentStatus(token);

      const payerEmail = paymentStatus.payer;
      const director = await this.prisma.user.findFirst({
        where: {
          role: Role.DIRECTOR,
          OR: [
            paymentStatus.subscriptionId
              ? { flowSubscriptionId: paymentStatus.subscriptionId }
              : undefined,
            payerEmail ? { email: payerEmail } : undefined,
          ].filter(Boolean) as any,
        },
        select: {
          id: true,
          email: true,
          flowNextBillingDate: true,
          planLimitId: true,
        },
      });

      if (!director) {
        throw new BadRequestException('No se encontró director para el pago');
      }

      const flowStatus = Number(paymentStatus.status);
      const isPaid = flowStatus === 2;
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      await this.prisma.user.update({
        where: { id: director.id },
        data: {
          flowSubscriptionStatus: isPaid ? 'ACTIVE' : 'PENDING',
          flowLastPaymentStatus: flowStatus,
          flowLastToken: token,
          flowNextBillingDate: isPaid ? nextBillingDate : director.flowNextBillingDate,
        },
      });

      const periodKey = new Date().toISOString().slice(0, 7);
      const resolvedAmount = Number(paymentStatus.amount ?? 0);
      const paidAt = isPaid ? new Date() : null;

      if (paymentStatus.subscriptionId) {
        await this.prisma.subscriptionSale.upsert({
          where: {
            flowSubscriptionId_saleType_periodKey: {
              flowSubscriptionId: paymentStatus.subscriptionId,
              saleType: SubscriptionSaleType.RENEWAL,
              periodKey,
            },
          },
          update: {
            status: isPaid
              ? SubscriptionSaleStatus.PAID
              : SubscriptionSaleStatus.FAILED,
            paidAt,
            flowToken: token,
            amount: resolvedAmount > 0 ? resolvedAmount : undefined,
            payload: paymentStatus,
          },
          create: {
            directorId: director.id,
            planLimitId: director.planLimitId ?? null,
            flowSubscriptionId: paymentStatus.subscriptionId,
            flowToken: token,
            flowOrder:
              paymentStatus.flowOrder != null
                ? String(paymentStatus.flowOrder)
                : null,
            amount: resolvedAmount,
            currency: 'CLP',
            billingCycle: 'mensual',
            periodKey,
            saleType: SubscriptionSaleType.RENEWAL,
            status: isPaid
              ? SubscriptionSaleStatus.PAID
              : SubscriptionSaleStatus.FAILED,
            paidAt,
            payload: paymentStatus,
          },
        });
      }

      await this.prisma.subscriptionSale.updateMany({
        where: {
          directorId: director.id,
          saleType: SubscriptionSaleType.INITIAL,
          status: SubscriptionSaleStatus.PENDING,
        },
        data: {
          status: isPaid
            ? SubscriptionSaleStatus.PAID
            : SubscriptionSaleStatus.FAILED,
          paidAt,
          flowToken: token,
        },
      });

      await this.prisma.flowWebhookEvent.update({
        where: { token },
        data: {
          directorId: director.id,
          payload: paymentStatus,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      this.logger.log(`Pago de suscripción procesado para director: ${director.id}`);
    } catch (error) {
      this.logger.error('Error procesando pago recurrente', error);

      await this.prisma.flowWebhookEvent.upsert({
        where: { token },
        update: {
          status: 'FAILED',
          error: error.message,
          processedAt: new Date(),
        },
        create: {
          token,
          eventType: 'SUBSCRIPTION_PAYMENT',
          status: 'FAILED',
          error: error.message,
          processedAt: new Date(),
        },
      });

      // No lanzamos error para evitar reintentos infinitos si es error de lógica interna
    }
  }
}
