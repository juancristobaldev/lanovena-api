import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './modules/prisma/prisma.service';
import { EvaluationCategory, MeasurementUnit, Role } from '@prisma/client';
import { S3Service } from './modules/s3/s3.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { TasksService } from './modules/tasks/tasks.service';
import { HttpAuthGuard } from './auth/guards/http-auth.guard';

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

@Controller()
export class AppController {
  constructor(
    private readonly tasks: TasksService,

    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}
  @Post('files/upload-pdf')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }

    // Validar tipo PDF
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }

    return this.s3.uploadFile(file);
  }

  @Get('files/pdf/:key')
  async getFile(@Param('key') key: string, @Res() res: Response) {
    const file = await this.s3.getFileWithMeta(key);

    res.set({
      'Content-Type': file.contentType || 'application/pdf',
      'Content-Disposition': `inline; filename="${key}"`,
    });

    res.send(file.buffer);
  }

  @Post('files/upload-image')
  @UseGuards(HttpAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo de imagen requerido');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten imagenes JPG, PNG, WEBP o GIF',
      );
    }

    return this.s3.uploadFile(file);
  }

  @Get('files/image/:key')
  async getImage(@Param('key') key: string, @Res() res: Response) {
    const file = await this.s3.getFileWithMeta(key);

    res.set({
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${key}"`,
    });

    res.send(file.buffer);
  }

  @Get('/admin')
  async setAdmin(): Promise<any> {
    return await this.prisma.user.update({
      where: {
        id: '91be3954-83b6-477e-ae6a-a58b9bc5de64',
      },
      data: {
        role: Role.SUPERADMIN,
      },
    });
  }
  @Get('/generate-fees')
  async runNow() {
    return this.tasks.generateMonthlyFees();
  }
  @Get('/upload')
  async convertAllInCommercial() {
    const schools = await this.prisma.school.findMany();

    console.log({ schools });
    const promises = schools.map(async (s) => {
      await this.prisma.school.update({
        where: {
          id: s.id,
        },
        data: {
          mode: 'COMMERCIAL',
        },
      });
    });

    await Promise.all(promises);
  }

  @Get('/delete-tournaments')
  async deleteTournaments() {
    await this.prisma.tournament.deleteMany();
  }

  @Get('/users')
  async getUsers() {
    await this.prisma.school.updateMany({
      data: {
        isActive: true,
      },
    });

    /*
    const coachs = await this.prisma.user.findMany({
      where: {
        role: Role.COACH,
      },
    });
    const players = await this.prisma.player.findMany();
    const apoderados = await this.prisma.user.findMany({
      where: {
        role: Role.GUARDIAN,
      },
    });
    const admins = await this.prisma.user.findMany({
      where: {
        role: Role.SUPERADMIN,
      },
    });
 */

    const directors = await this.prisma.user.findMany({
      where: {
        role: Role.DIRECTOR,
      },
    });

    return {
      //coachs, players, apoderados, admins,
      directors,
    };
  }
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
