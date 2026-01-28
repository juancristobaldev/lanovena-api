import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [HttpModule],
  providers: [PrismaService, JwtService, ConfigService],
  exports: [
    PrismaService,
    JwtService,
    ConfigService,
    HttpModule, // ✅ CLAVE
  ],
})
export class CoreModule {}
