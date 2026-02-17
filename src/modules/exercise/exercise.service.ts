import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../entitys/user.entity';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExerciseService {
  constructor(private readonly prisma: PrismaService) {}

  // Crear Ejercicio vinculado a la escuela del Director
  async create(createExerciseInput: any, schoolId: string) {
    return this.prisma.exercise.create({
      data: {
        ...createExerciseInput,
        school: {
          connect: { id: schoolId }, // Asumiendo que el User tiene schoolId
        },
        // Opcional: registrar al autor
        // authorId: user.id
      },
    });
  }

  // Buscar TODOS los ejercicios DE MI ESCUELA
  async findAllBySchool(user: UserEntity, schoolId?: string) {
    return this.prisma.exercise.findMany({
      where: {
        schoolId: schoolId, // FILTRO CRÍTICO DE SEGURIDAD
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, user: UserEntity) {
    // Verificar que pertenezca a mi escuela antes de borrar
    await this.prisma.exercise.findFirstOrThrow({
      where: {
        id,
        school: {
          staff: {
            some: {
              userId: user.id,
            },
          },
        },
      },
    });

    return this.prisma.exercise.delete({
      where: { id },
    });
  }
}
