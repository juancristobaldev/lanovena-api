import { Module } from '@nestjs/common';
import { ExerciseService } from './exercise.service';
import { ExerciseResolver } from './exercise.resolver';

@Module({
  providers: [ExerciseService, ExerciseResolver]
})
export class ExerciseModule {}
