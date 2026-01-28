import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Global()
@Module({
  providers: [PrismaService, JwtService],
  exports: [PrismaService, JwtService],
})
export class CoreModule {}
