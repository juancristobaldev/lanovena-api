import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTacticalBoardInput,
  UpdateTacticalBoardInput,
} from 'src/entitys/methodology.entity';

@Injectable()
export class TacticalBoardsService {
  constructor(private prisma: PrismaService) {}

  // Crear Pizarra: Primero buscamos el perfil de Coach del usuario
  async create(userId: string, input: CreateTacticalBoardInput) {
    const coach = await this.prisma.coach.findUnique({
      where: { userId },
    });

    if (!coach) {
      throw new ForbiddenException(
        'El usuario no tiene un perfil de Entrenador activo.',
      );
    }

    return this.prisma.tacticalBoard.create({
      data: {
        ...input,
        coachId: coach.id,
      },
    });
  }

  // Listar pizarras del entrenador actual
  async findAllByUser(userId: string) {
    // Buscamos al coach por userId
    const coach = await this.prisma.coach.findUnique({
      where: { userId },
    });

    if (!coach) return [];

    return this.prisma.tacticalBoard.findMany({
      where: { coachId: coach.id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Actualizar pizarra (Validando propiedad)
  async update(userId: string, input: UpdateTacticalBoardInput) {
    const board = await this.prisma.tacticalBoard.findUnique({
      where: { id: input.id },
      include: { coach: true },
    });

    if (!board) throw new NotFoundException('Pizarra no encontrada');

    // Validar que la pizarra pertenezca al usuario que intenta editarla
    if (board.coach.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para editar esta pizarra.',
      );
    }

    return this.prisma.tacticalBoard.update({
      where: { id: input.id },
      data: {
        title: input.title,
        configurationJson: input.configurationJson,
      },
    });
  }

  // Eliminar pizarra
  async delete(userId: string, boardId: string) {
    const board = await this.prisma.tacticalBoard.findUnique({
      where: { id: boardId },
      include: { coach: true },
    });

    if (!board) throw new NotFoundException('Pizarra no encontrada');

    if (board.coach.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar esta pizarra.',
      );
    }

    return this.prisma.tacticalBoard.delete({ where: { id: boardId } });
  }
}
