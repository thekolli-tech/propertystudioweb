import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.module';
import { IdempotencyService } from '../../src/common/idempotency/idempotency.service';
import { PasswordService } from '../../src/common/crypto/password.service';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { requireOrganizationScope } from '../../src/common/tenancy/access-scope';

function extractSessionCookie(setCookie: string[] | undefined): string | undefined {
  if (!setCookie) return undefined;
  const match = setCookie.find((value) => value.startsWith('ps_session='));
  return match?.split(';')[0];
}

describe('Phase 2 security kernel', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwords: PasswordService;
  let idempotency: IdempotencyService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '1000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '1000';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    passwords = app.get(PasswordService);
    idempotency = app.get(IdempotencyService);
  });

  beforeEach(async () => {
    // Clean kernel tables between tests (order matters for FKs).
    // Temporarily disable append-only triggers so test cleanup can reset state.
    await prisma.$executeRawUnsafe(
      'ALTER TABLE audit_events DISABLE TRIGGER audit_events_no_delete',
    );
    await prisma.$executeRawUnsafe('DELETE FROM audit_events');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE audit_events ENABLE TRIGGER audit_events_no_delete',
    );
    await prisma.$executeRawUnsafe('DELETE FROM media_assets');
    await prisma.$executeRawUnsafe('DELETE FROM document_assets');
    await prisma.$executeRawUnsafe('DELETE FROM resource_assignments');
    await prisma.$executeRawUnsafe('DELETE FROM communities');
    await prisma.$executeRawUnsafe('DELETE FROM lead_purchases');
    await prisma.$executeRawUnsafe('DELETE FROM refunds');
    await prisma.$executeRawUnsafe('DELETE FROM invoice_items');
    await prisma.$executeRawUnsafe('DELETE FROM invoices');
    await prisma.$executeRawUnsafe('DELETE FROM wallet_ledger_entries');
    await prisma.$executeRawUnsafe('DELETE FROM wallets');
    await prisma.$executeRawUnsafe('DELETE FROM financial_transactions');
    await prisma.$executeRawUnsafe('DELETE FROM organization_subscriptions');
    await prisma.$executeRawUnsafe('DELETE FROM plan_entitlements');
    await prisma.$executeRawUnsafe('DELETE FROM subscription_plans');
    await prisma.$executeRawUnsafe('DELETE FROM payment_webhook_events');
    await prisma.$executeRawUnsafe('DELETE FROM crm_activities');
    await prisma.$executeRawUnsafe('DELETE FROM crm_follow_ups');
    await prisma.$executeRawUnsafe('DELETE FROM crm_site_visits');
    await prisma.$executeRawUnsafe('DELETE FROM crm_deals');
    await prisma.$executeRawUnsafe('DELETE FROM crm_contacts');
    await prisma.$executeRawUnsafe('DELETE FROM leads');
    await prisma.$executeRawUnsafe('DELETE FROM requirements');
    await prisma.$executeRawUnsafe('DELETE FROM properties');
    await prisma.$executeRawUnsafe('DELETE FROM projects');
    await prisma.$executeRawUnsafe('DELETE FROM idempotency_keys');
    await prisma.$executeRawUnsafe('DELETE FROM refresh_tokens');
    await prisma.$executeRawUnsafe('DELETE FROM sessions');
    await prisma.$executeRawUnsafe('DELETE FROM developer_profiles');
    await prisma.$executeRawUnsafe('DELETE FROM agency_profiles');
    await prisma.$executeRawUnsafe('DELETE FROM organization_memberships');
    await prisma.$executeRawUnsafe('DELETE FROM organizations');
    await prisma.$executeRawUnsafe('DELETE FROM user_platform_roles');
    await prisma.$executeRawUnsafe('DELETE FROM user_personas');
    await prisma.$executeRawUnsafe('DELETE FROM user_credentials');
    await prisma.$executeRawUnsafe('DELETE FROM users');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('registers and authenticates a user with a secure session cookie', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'seeker@example.com',
        password: 'CorrectHorseBattery!',
        personas: ['PROPERTY_SEEKER'],
      })
      .expect(201);

    expect(register.body.user.publicId).toMatch(/^PS-USER-\d{6,}$/);
    expect(register.body.user.email).toBe('seeker@example.com');
    expect(register.body.user.personas).toContain('PROPERTY_SEEKER');

    const cookie = extractSessionCookie(register.headers['set-cookie']);
    expect(cookie).toBeTruthy();

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie!)
      .expect(200);
    expect(me.body.user.publicId).toBe(register.body.user.publicId);
  });

  it('rejects invalid credentials and does not store plaintext passwords', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'owner@example.com',
        password: 'CorrectHorseBattery!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@example.com',
        password: 'wrong-password',
      })
      .expect(401);

    const credential = await prisma.userCredential.findFirst({
      include: { user: true },
    });
    expect(credential?.passwordHash).toBeTruthy();
    expect(credential?.passwordHash.includes('CorrectHorseBattery!')).toBe(false);
    expect(credential?.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(await passwords.verify(credential!.passwordHash, 'CorrectHorseBattery!')).toBe(true);

    const failedAudit = await prisma.auditEvent.findFirst({
      where: { action: 'auth.login_failed' },
    });
    expect(failedAudit).toBeTruthy();
  });

  it('creates a session on login and revokes it on logout', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'agent@example.com',
        password: 'CorrectHorseBattery!',
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'agent@example.com',
        password: 'CorrectHorseBattery!',
      })
      .expect(201);

    const cookie = extractSessionCookie(login.headers['set-cookie']);
    expect(cookie).toBeTruthy();

    const sessionsBefore = await prisma.session.count({ where: { revokedAt: null } });
    expect(sessionsBefore).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie!)
      .expect(201);

    await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookie!).expect(401);

    const tokenHash = cookie!.replace('ps_session=', '');
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update(decodeURIComponent(tokenHash)).digest('hex');
    const session = await prisma.session.findUnique({ where: { tokenHash: hash } });
    expect(session?.revokedAt).toBeTruthy();

    const logoutAudit = await prisma.auditEvent.findFirst({ where: { action: 'auth.logout' } });
    expect(logoutAudit).toBeTruthy();
  });

  it('enforces organization membership and blocks cross-tenant access', async () => {
    const userA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'dev-a@example.com',
        password: 'CorrectHorseBattery!',
      })
      .expect(201);
    const cookieA = extractSessionCookie(userA.headers['set-cookie'])!;

    const userB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'dev-b@example.com',
        password: 'CorrectHorseBattery!',
      })
      .expect(201);
    const cookieB = extractSessionCookie(userB.headers['set-cookie'])!;

    const orgA = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', cookieA)
      .send({ name: 'Alpha Developers', type: 'DEVELOPER' })
      .expect(201);

    const orgB = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', cookieB)
      .send({ name: 'Beta Agency', type: 'AGENCY' })
      .expect(201);

    expect(orgA.body.publicId).toMatch(/^PS-ORG-\d{6,}$/);
    expect(orgB.body.publicId).toMatch(/^PS-ORG-\d{6,}$/);

    // A can read A
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.body.publicId}`)
      .set('Cookie', cookieA)
      .expect(200);

    // B cannot read A (not-found, no existence leak)
    const cross = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.body.publicId}`)
      .set('Cookie', cookieB)
      .expect(404);
    expect(cross.body.error.code).toBe('NOT_FOUND');

    // B cannot switch into A
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.body.publicId}/switch`)
      .set('Cookie', cookieB)
      .expect(404);

    // B cannot list A's members
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.body.publicId}/members`)
      .set('Cookie', cookieB)
      .expect(404);

    // Switching into own org works and is audited
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgB.body.publicId}/switch`)
      .set('Cookie', cookieB)
      .expect(201);

    const switchAudit = await prisma.auditEvent.findFirst({
      where: { action: 'organization.switched' },
    });
    expect(switchAudit).toBeTruthy();

    // Scoped helper rejects mismatched organization scope
    expect(() =>
      requireOrganizationScope({ type: 'organization', organizationId: 'org-a' }, 'org-b'),
    ).toThrow(/TENANT_SCOPE_VIOLATION/);
  });

  it('supports personas, platform roles, and password change revocation', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'CorrectHorseBattery!',
      })
      .expect(201);
    const cookie = extractSessionCookie(register.headers['set-cookie'])!;

    await request(app.getHttpServer())
      .post('/api/v1/users/me/personas')
      .set('Cookie', cookie)
      .send({ personas: ['INVESTOR', 'PROPERTY_OWNER'] })
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { publicId: register.body.user.publicId },
    });
    await prisma.userPlatformRole.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        role: 'ADMIN',
      },
    });

    // Re-login to pick up role in session actor
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'CorrectHorseBattery!',
      })
      .expect(201);
    const adminCookie = extractSessionCookie(login.headers['set-cookie'])!;

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(me.body.user.platformRoles).toContain('ADMIN');
    expect(me.body.user.personas).toEqual(expect.arrayContaining(['INVESTOR', 'PROPERTY_OWNER']));

    const target = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'staff@example.com',
        password: 'CorrectHorseBattery!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${target.body.user.publicId}/platform-roles`)
      .set('Cookie', adminCookie)
      .send({ role: 'MODERATOR' })
      .expect(201);

    const roleAudit = await prisma.auditEvent.findFirst({
      where: { action: 'user.platform_role_granted' },
    });
    expect(roleAudit).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/v1/auth/password/change')
      .set('Cookie', adminCookie)
      .send({
        currentPassword: 'CorrectHorseBattery!',
        newPassword: 'NewCorrectHorseBattery!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', adminCookie)
      .expect(401);
  });

  it('provides idempotency foundation and append-only audit enforcement', async () => {
    const reserved = await idempotency.reserve({
      key: 'pay_test_1',
      scope: 'payments',
      userId: null,
      organizationId: null,
    });
    expect(reserved.existing).toBe(false);

    const again = await idempotency.reserve({
      key: 'pay_test_1',
      scope: 'payments',
      userId: null,
      organizationId: null,
    });
    expect(again.existing).toBe(true);
    expect(again.id).toBe(reserved.id);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'audit@example.com',
        password: 'CorrectHorseBattery!',
      })
      .expect(201);

    const event = await prisma.auditEvent.findFirstOrThrow({
      where: { action: 'auth.register' },
    });

    await expect(
      prisma.auditEvent.update({
        where: { id: event.id },
        data: { action: 'tampered' },
      }),
    ).rejects.toThrow(/append-only/i);
  });

  it('rate-limits abusive authentication attempts', async () => {
    const { RedisService } = await import('../../src/common/rate-limit/redis.module');
    const redis = app.get(RedisService);
    const keys = await redis.client.keys('auth:failed:*');
    if (keys.length > 0) {
      await redis.client.del(...keys);
    }

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'limit@example.com',
        password: 'CorrectHorseBattery!',
      })
      .expect(201);

    let sawRateLimit = false;
    for (let i = 0; i < 12; i += 1) {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'limit@example.com',
        password: 'wrong-password',
      });
      if (response.status === 429) {
        expect(response.body.error.code).toBe('RATE_LIMITED');
        sawRateLimit = true;
        break;
      }
      expect(response.status).toBe(401);
    }

    expect(sawRateLimit).toBe(true);
  });
});
