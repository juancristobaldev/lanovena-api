import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTacticalBoardInput,
  UpdateTacticalBoardInput,
} from 'src/entitys/tactical-board.entity'; // Asegúrate que la ruta sea correcta
import { UserEntity } from 'src/entitys/user.entity';

@Injectable()
export class TacticalBoardService {
  constructor(private readonly prisma: PrismaService) {}

  // --- CREAR ---
  async create(input: CreateTacticalBoardInput, user: UserEntity) {
    // 1. BUSCAR EL PERFIL DE COACH ASOCIADO AL USUARIO
    // No confiamos en input.coachId, usamos user.id para buscar el perfil real.
    const coachProfile = await this.prisma.coach.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!coachProfile) {
      throw new ForbiddenException(
        'No tienes un perfil de Entrenador (Coach) activo para crear pizarras.',
      );
    }

    // 2. CREAR LA PIZARRA CONECTANDO AL COACH ENCONTRADO
    return this.prisma.tacticalBoard.create({
      data: {
        title: input.title,
        description: input.description,
        initialState: input.initialState,
        animation: input.animation,
        authorId: user.id, // Guardamos el User ID como referencia de auditoría

        // Conexión con la Categoría
        category: {
          connect: {
            id: input.categoryId,
          },
        },

        // Conexión con el Coach (Usando el ID que acabamos de buscar)
        coach: {
          connect: {
            id: coachProfile.id,
          },
        },
      },
    });
  }

  // --- BUSCAR POR CATEGORÍA ---
  async findAllByCategory(categoryId: string) {
    return this.prisma.tacticalBoard.findMany({
      where: { categoryId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // --- BUSCAR UNO ---
  async findOne(id: string) {
    const board = await this.prisma.tacticalBoard.findUnique({
      where: { id },
    });
    if (!board) throw new NotFoundException(`Pizarra ${id} no encontrada`);
    return board;
  }

  // --- ACTUALIZAR ---
  async update(id: string, input: UpdateTacticalBoardInput) {
    await this.findOne(id); // Verificar existencia

    return this.prisma.tacticalBoard.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        initialState: input.initialState,
        animation: input.animation,
        tags: input.tags,
      },
    });
  }

  // --- ELIMINAR ---
  async remove(id: string) {
    // Aquí podrías validar que el user sea el dueño antes de borrar si quisieras
    return this.prisma.tacticalBoard.delete({
      where: { id },
    });
  }
}
