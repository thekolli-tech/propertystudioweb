import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AppConfigService } from './common/config/app-config.service';
import { validateEnv } from './common/config/env.schema';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap(): Promise<void> {
  // Fail fast before Nest DI wiring if env is invalid.
  validateEnv(process.env);

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);
  app.useLogger(app.get(PinoLogger));
  app.use(helmet());
  app.enableCors({
    origin: config.values.WEB_ORIGIN,
    credentials: true,
  });
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(config.values.API_PORT, config.values.API_HOST);
  Logger.log(`API listening on ${config.values.API_HOST}:${config.values.API_PORT}`, 'Bootstrap');
}

void bootstrap();
