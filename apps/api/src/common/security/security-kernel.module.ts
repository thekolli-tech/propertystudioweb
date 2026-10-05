import { Global, Module } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { AuthGuard, PermissionsGuard } from '../auth/auth.guards';
import { SessionService } from '../auth/session.service';
import { PasswordService } from '../crypto/password.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { PublicIdService } from '../ids/public-id.service';

@Global()
@Module({
  providers: [
    AuditService,
    PasswordService,
    PublicIdService,
    SessionService,
    IdempotencyService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [
    AuditService,
    PasswordService,
    PublicIdService,
    SessionService,
    IdempotencyService,
    AuthGuard,
    PermissionsGuard,
  ],
})
export class SecurityKernelModule {}
