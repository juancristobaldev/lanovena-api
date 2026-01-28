import {
  Controller,
  Post,
  Body,
  Logger,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { FlowService } from './flow.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('flow/hooks')
export class FlowController {
  private readonly logger = new Logger(FlowController.name);

  constructor(
    private readonly flowService: FlowService,
    private readonly prisma: PrismaService,
  ) {}

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
      // Consultar estado a Flow
      const status = await this.flowService.getRegisterStatus(token);

      // Status 1 = Tarjeta Inscrita Exitosamente
      if (status.status === 1) {
        const flowCustomerId = status.customerId;
        // Extraer ID de escuela del customerId (formato: "school_UUID")
        const schoolId = flowCustomerId.replace('school_', '');

        await this.prisma.school.update({
          where: { id: schoolId },
          data: {
            // Aquí podrías guardar flags indicando que ya tiene tarjeta
            // hasPaymentMethod: true
            // creditCardLast4: status.last4CardDigits (si Flow lo devuelve)
          },
        });

        this.logger.log(
          `Tarjeta registrada exitosamente para escuela ${schoolId}`,
        );
        return { success: true, message: 'Tarjeta validada' };
      } else {
        throw new BadRequestException(
          'El registro de la tarjeta no fue exitoso',
        );
      }
    } catch (error) {
      this.logger.error(`Error validando tarjeta: ${error.message}`);
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
      const paymentStatus = await this.flowService.getPaymentStatus(token);

      // Verificamos si es un pago exitoso (Status 2)
      if (paymentStatus.status === 2) {
        // Es un cobro de suscripción?
        if (this.flowService.isSubscriptionPayment(paymentStatus)) {
          // El 'subject' o 'payer' nos ayuda a identificar, pero lo más seguro
          // es usar el commerceOrder si lo vinculamos, o el payer email.

          // Opción A: Buscar escuela por email del pagador
          const payerEmail = paymentStatus.payer;

          // Actualizamos la fecha de vigencia de la suscripción
          // Asumiendo que el pago cubre 1 mes
          const nextBillingDate = new Date();
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

          await this.prisma.school.updateMany({
            where: {
              // Nota: Ideal tener flowCustomerId en el modelo School para ser exactos
              users: { some: { email: payerEmail, role: 'DIRECTOR' } },
            },
            data: {
              subscriptionStatus: 'ACTIVE',
              nextBillingDate: nextBillingDate,
            },
          });

          this.logger.log(`Pago de suscripción procesado para: ${payerEmail}`);
        }
      }
    } catch (error) {
      this.logger.error('Error procesando pago recurrente', error);
      // No lanzamos error para evitar reintentos infinitos si es error de lógica interna
    }
  }
}
