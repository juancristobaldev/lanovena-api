import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './modules/prisma/prisma.service';
import { EvaluationCategory, MeasurementUnit } from '@prisma/client';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('seed')
  async seed() {
    const protocols = [
      {
        name: 'Velocidad 20m',
        cat: EvaluationCategory.PHYSICAL,
        unit: MeasurementUnit.SECONDS,
      },
      {
        name: 'Salto CMJ',
        cat: EvaluationCategory.PHYSICAL,
        unit: MeasurementUnit.CENTIMETERS,
      },
      {
        name: 'Yo-Yo Test',
        cat: EvaluationCategory.PHYSICAL,
        unit: MeasurementUnit.COUNT,
      },
      {
        name: 'Técnica de Pase',
        cat: EvaluationCategory.TECHNICAL,
        unit: MeasurementUnit.POINTS,
      },
      {
        name: 'Táctica Posicional',
        cat: EvaluationCategory.TACTICAL,
        unit: MeasurementUnit.POINTS,
      },
      {
        name: 'Vel. de Reacción',
        cat: EvaluationCategory.SPEED,
        unit: MeasurementUnit.SECONDS,
      },
    ];

    const results = await Promise.all(
      protocols.map((p) =>
        this.prisma.testProtocol.upsert({
          where: { name: p.name },
          update: {},
          create: {
            name: p.name,
            description: `Protocolo estándar para ${p.name}`,
            category: p.cat,
            unit: p.unit,
            isGlobal: true,
          },
        }),
      ),
    );

    return { count: results.length, message: 'Protocolos sincronizados' };
  }
}
