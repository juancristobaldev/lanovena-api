import { Module } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { SchoolsResolver } from './schools.resolver';

@Module({
  providers: [SchoolsService, SchoolsResolver]
})
export class SchoolsModule {}
