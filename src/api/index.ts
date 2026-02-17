import 'tsconfig-paths/register';

import { createServer } from 'http';
import { parse } from 'url';
import { AppModule } from '../src/app.module';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const app = express();

let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(app),
    );
    await nestApp.init();
    cachedServer = createServer(app);
  }
  return cachedServer;
}

export default async function handler(req: any, res: any) {
  const server = await bootstrap();
  server.emit('request', req, res);
}
