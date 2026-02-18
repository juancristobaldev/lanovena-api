import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import serverless from 'serverless-http';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

// Variable global para guardar el servidor "caliente"
let cachedServer: any;

const bootstrap = async () => {
  // Si ya existe, no lo inicies de nuevo (Ahorra tiempo y recursos)
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

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
    
    // Guardamos la instancia lista en la variable global
    cachedServer = serverless(expressApp);
  }
  
  return cachedServer;
};

// La función que exportamos ahora espera a que bootstrap termine o devuelva la caché
export default async (req: any, res: any) => {
  const handler = await bootstrap();
  return handler(req, res);
};