import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { AppConfigModule } from './common/config/app-config.module';
import { AppConfigService } from './common/config/app-config.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { RateLimitModule } from './common/rate-limit/rate-limit.module';
import { RedisModule } from './common/rate-limit/redis.module';
import { RequestIdMiddleware } from './common/request-context/request-id.middleware';
import { OriginCheckMiddleware } from './common/security/origin-check.middleware';
import { SecurityKernelModule } from './common/security/security-kernel.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CrmModule } from './modules/crm/crm.module';
import { HealthModule } from './modules/health/health.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.values.LOG_LEVEL,
          transport:
            config.values.NODE_ENV === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["set-cookie"]',
              'password',
              'currentPassword',
              'newPassword',
              'token',
              'refreshToken',
              'accessToken',
            ],
            remove: true,
          },
          customProps: (req) => ({
            requestId: (req as { requestId?: string }).requestId,
          }),
          autoLogging: true,
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    SecurityKernelModule,
    RateLimitModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    CatalogModule,
    MarketplaceModule,
    CrmModule,
  ],
  providers: [OriginCheckMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer
      .apply(OriginCheckMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'ready', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
