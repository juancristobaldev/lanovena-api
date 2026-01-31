import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus, Prisma } from '@prisma/client';

@Injectable()
export class TrainingSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async registerAttendance(
    sessionId: string,
    playerId: string,
    status: AttendanceStatus,
  ) {
    return this.prisma.attendance.upsert({
      where: {
        // Gracias al @@unique en el schema, Prisma genera este campo compuesto
        sessionId_playerId: {
          sessionId,
          playerId,
        },
      },
      // Si ya existe la asistencia, solo actualizamos el estado
      update: {
        status,
      },
      // Si NO existe, la creamos nueva
      create: {
        sessionId,
        playerId,
        status,
      },
      // Incluimos al jugador para que el frontend pueda actualizar la UI inmediatamente
      include: {
        player: true,
      },
    });
  }

  /* ===========================================================================
   * CREATE
   * =========================================================================== */

  async create(
    data: Prisma.TrainingSessionCreateInput,
    user: { schoolId: string },
  ) {
    return this.prisma.trainingSession.create({
      data: {
        ...data,
        category: data.category,
      },
    });
  }

  /* ===========================================================================
   * READ
   * =========================================================================== */

  async findByCategory(categoryId: string, schoolId: string) {
    return this.prisma.trainingSession.findMany({
      where: {
        categoryId,
        category: {
          schoolId,
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, schoolId: string) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            players: true, // Necesario para mostrar la lista completa de alumnos
          },
        },
        exercises: {
          include: {
            exercise: true, // Detalles del ejercicio (nombre, foto)
          },
          orderBy: { orderIndex: 'asc' }, // Importante para el orden
        },
        attendance: {
          include: {
            player: true, // Para saber el nombre del alumno que asistió
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesión de entrenamiento no encontrada');
    }

    if (session.category.schoolId !== schoolId) {
      throw new ForbiddenException('Acceso denegado');
    }

    return session;
  }

  /* ===========================================================================
   * UPDATE
   * =========================================================================== */

  async update(
    id: string,
    data: Prisma.TrainingSessionUpdateInput,
    schoolId: string,
  ) {
    await this.findOne(id, schoolId);

    return this.prisma.trainingSession.update({
      where: { id },
      data,
    });
  }

  /* ===========================================================================
   * DELETE
   * =========================================================================== */

  async remove(id: string, schoolId: string): Promise<boolean> {
    await this.findOne(id, schoolId);

    await this.prisma.trainingSession.delete({
      where: { id },
    });

    return true;
  }
}
