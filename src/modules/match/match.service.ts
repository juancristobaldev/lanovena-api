import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchInput, UpdateMatchInput } from 'src/entitys/match.entity';
import { UserEntity } from 'src/entitys/user.entity';

@Injectable()
export class MatchService {
  constructor(private readonly prisma: PrismaService) {}

  // --- CREAR ---
  async create(createMatchInput: CreateMatchInput, user: UserEntity) {
    // Aquí podrías validar si el usuario tiene permiso para crear en esta categoría
    // Por ahora, creamos el partido directamente.

    return this.prisma.match.create({
      data: {
        ...createMatchInput,
        // Si necesitas registrar quién lo creó, podrías agregar createdById: user.id
      },
      include: {
        category: true, // Incluimos la categoría para devolver el objeto completo
      },
    });
  }

  // --- LISTAR TODOS ---
  async findAll() {
    return this.prisma.match.findMany({
      orderBy: {
        date: 'asc', // Ordenar por fecha, lo más próximo primero
      },
      include: {
        category: true,
      },
    });
  }

  // --- LISTAR POR CATEGORÍA ---
  async findAllByCategory(categoryId: string) {
    return this.prisma.match.findMany({
      where: { categoryId },
      orderBy: { date: 'asc' },
      include: { category: true },
    });
  }

  // --- OBTENER UNO ---
  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!match) {
      throw new NotFoundException(`Partido con ID ${id} no encontrado`);
    }

    return match;
  }

  // --- ACTUALIZAR ---
  async update(id: string, updateMatchInput: UpdateMatchInput) {
    // Verificar existencia primero
    await this.findOne(id);

    return this.prisma.match.update({
      where: { id },
      data: updateMatchInput,
      include: { category: true },
    });
  }

  // --- ELIMINAR ---
  async remove(id: string) {
    await this.findOne(id); // Verificar existencia

    return this.prisma.match.delete({
      where: { id },
    });
  }
}
