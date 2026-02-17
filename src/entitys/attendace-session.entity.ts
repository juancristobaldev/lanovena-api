import { ObjectType, Field, ID, registerEnumType, Int } from '@nestjs/graphql';
import { TrainingSessionEntity } from './training-session.entity';
import { AttendanceStatus } from '@prisma/client'; // Usamos el enum nativo de Prisma
import { PlayerEntity } from './player.entity';

// 1. Registramos el Enum para que GraphQL lo entienda
registerEnumType(AttendanceStatus, {
  name: 'AttendanceStatus',
  description:
    'Estado de asistencia del jugador (PRESENT, ABSENT, LATE, EXCUSED)',
});

@ObjectType()
export class AttendanceEntity {
  @Field(() => ID)
  id: string;

  @Field(() => AttendanceStatus)
  status: AttendanceStatus;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;

  // RELACIONES

  @Field(() => PlayerEntity)
  player: PlayerEntity;

  @Field(() => TrainingSessionEntity)
  session: TrainingSessionEntity;

  @Field(() => String, { nullable: true })
  feedback?: string;

  @Field(() => Int, { nullable: true })
  rating?: number;
}
