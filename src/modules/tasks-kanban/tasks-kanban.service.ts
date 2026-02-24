import { Task } from '@/entitys/tasks.entity';
import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksKanbanService {
  constructor(private prisma: PrismaService) {}

  // 1. Obtener tablero ordenado
  async getBoardTasks(schoolId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { schoolId },
      orderBy: { position: 'asc' }, // Fundamental para mantener la UX del usuario
      include: { assignedToUser: true },
    });
  }

  // 2. Crear tarea (siempre va al final de la columna TODO)
  async createTask(data: {
    title: string;
    description?: string;
    schoolId: string;
    assignedToUserId?: string;
    dueDate?: Date;
  }): Promise<Task> {
    // Buscamos la posición más alta actual en TODO
    const lastTask = await this.prisma.task.findFirst({
      where: { schoolId: data.schoolId, status: 'TODO' },
      orderBy: { position: 'desc' },
    });

    const newPosition = lastTask ? lastTask.position + 1024 : 1024; // Usar saltos amplios (1024) reduce colisiones futuras

    return this.prisma.task.create({
      data: {
        ...data,
        status: TaskStatus.TODO,
        position: newPosition,
      },
    });
  }

  // 3. Motor Drag & Drop (Mover y Reordenar)
  async moveTask(
    id: string,
    newStatus: TaskStatus,
    newPosition: number,
  ): Promise<Task> {
    const currentTask = await this.prisma.task.findUnique({ where: { id } });
    if (!currentTask) throw new Error('Task not found');

    return this.prisma.$transaction(async (tx) => {
      // Si la tarjeta se mueve hacia ABAJO en la misma columna, o entra a una NUEVA columna
      await tx.task.updateMany({
        where: {
          schoolId: currentTask.schoolId,
          status: newStatus,
          position: { gte: newPosition },
          id: { not: id }, // Excluimos la tarjeta actual
        },
        data: { position: { increment: 1024 } }, // Desplazamos las demás hacia abajo
      });

      // Actualizamos la tarjeta objetivo
      return tx.task.update({
        where: { id },
        data: {
          status: newStatus,
          position: newPosition,
        },
      });
    });
  }
}
