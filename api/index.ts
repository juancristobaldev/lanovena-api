import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import serverless from 'serverless-http';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

// Variable global para mantener el servidor "vivo" entre peticiones
let cachedServer: any;

const bootstrap = async () => {
  // Si ya existe el servidor, lo reutilizamos (Response instantáneo)
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    // Tu configuración exacta de CORS (extraída de tu main.ts original)
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'https://lanovena.pro',
        'https://www.lanovena.pro',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    
    cachedServer = serverless(expressApp);
  }
  return cachedServer;
};

// 🚨 ¡ESTO ES LO QUE FALTABA! 🚨
// Le dice a Vercel: "No toques el body de la petición, déjaselo a NestJS"
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req: any, res: any) => {
  const handler = await bootstrap();
  return handler(req, res);
};