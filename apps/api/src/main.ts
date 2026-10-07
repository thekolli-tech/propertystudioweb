import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AppConfigService } from './common/config/app-config.service';
import { validateEnv } from './common/config/env.schema';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap(): Promise<void> {
  validateEnv(process.env);

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
    bodyParser: false,
  });

  const config = app.get(AppConfigService);
  const bodyLimit = config.values.BODY_SIZE_LIMIT_BYTES;

  app.useLogger(app.get(PinoLogger));
  app.use(
    helmet({
      contentSecurityPolicy: false, // API-only Nest process; CSP belongs on the Next.js edge.
      crossOriginEmbedderPolicy: false,
      hsts: config.isProduction
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      noSniff: true,
    }),
  );
  app.use(cookieParser());
  // Preserve rawBody for webhook HMAC verification while enforcing size limits.
  app.use(
    json({
      limit: bodyLimit,
      verify: (req, _res, buf) => {
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(
    urlencoded({
      extended: true,
      limit: bodyLimit,
      verify: (req, _res, buf) => {
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'ready'],
  });
  app.enableCors({
    origin: config.values.WEB_ORIGIN,
    credentials: true,
  });
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(config.values.API_PORT, config.values.API_HOST);
  Logger.log(`API listening on ${config.values.API_HOST}:${config.values.API_PORT}`, 'Bootstrap');
}

void bootstrap();
