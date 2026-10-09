import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { newUuid } from '../../src/common/crypto/ids';
import { PrismaService } from '../../src/common/prisma/prisma.module';

/**
 * Lightweight regression coverage for obvious query explosions / unbounded lists.
 * Not a benchmark suite — asserts pagination bounds and bounded response shapes.
 */

function extractSessionCookie(setCookie: string[] | undefined): string | undefined {
  if (!setCookie) return undefined;
  const match = setCookie.find((value) => value.startsWith('ps_session='));
  return match?.split(';')[0];
}

async function register(app: INestApplication, email: string, personas: string[] = []) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'CorrectHorseBattery!', personas })
    .expect(201);
  return {
    cookie: extractSessionCookie(response.headers['set-cookie'])!,
    publicId: response.body.user.publicId as string,
  };
}

async function onboardDeveloper(app: INestApplication, cookie: string, name: string) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/organizations/onboard')
    .set('Cookie', cookie)
    .send({
      type: 'DEVELOPER',
      name,
      profile: {
        legalName: `${name} Legal`,
        displayName: name,
        description: 'Perf test org',
        operatingZones: ['Hyderabad'],
        headquartersCity: 'Hyderabad',
      },
    })
    .expect(201);
  return response.body.organization.publicId as string;
}

async function grantAdmin(app: INestApplication, prisma: PrismaService, email: string) {
  const user = await register(app, email, []);
  await prisma.userPlatformRole.create({
    data: {
      id: newUuid(),
      userId: (await prisma.user.findFirstOrThrow({ where: { publicId: user.publicId } })).id,
      role: 'ADMIN',
    },
  });
  await request(app.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', user.cookie);
  const relogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: 'CorrectHorseBattery!' })
    .expect(201);
  return { ...user, cookie: extractSessionCookie(relogin.headers['set-cookie'])! };
}

describe('Phase 14E performance regression (bounded queries)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '2000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '2000';
    process.env.PAYMENTS_PROVIDER = 'SANDBOX';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE audit_events DISABLE TRIGGER audit_events_no_delete',
    );
    await prisma.$executeRawUnsafe('DELETE FROM audit_events');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE audit_events ENABLE TRIGGER audit_events_no_delete',
    );
    for (const table of [
      'ai_chat_analytics_events',
      'ai_conversation_messages',
      'ai_conversations',
      'crm_follow_ups',
      'crm_activities',
      'crm_site_visits',
      'crm_deals',
      'crm_contacts',
      'lead_access_grants',
      'lead_purchases',
      'leads',
      'requirements',
      'properties',
      'projects',
      'project_claims',
      'verification_documents',
      'verification_cases',
      'financial_transactions',
      'organization_subscriptions',
      'plan_entitlements',
      'subscription_plans',
      'integration_usage_events',
      'api_clients',
      'partner_integrations',
      'developer_profiles',
      'agency_profiles',
      'organization_memberships',
      'organizations',
      'sessions',
      'user_platform_roles',
      'user_personas',
      'user_credentials',
      'users',
    ] as const) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('discovery lists honor pagination limits', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public/properties')
      .query({ limit: 500 })
      .expect(422);

    const ok = await request(app.getHttpServer())
      .get('/api/v1/public/properties')
      .query({ limit: 20 })
      .expect(200);
    expect(Array.isArray(ok.body.properties)).toBe(true);
    expect(ok.body.properties.length).toBeLessThanOrEqual(20);
  });

  it('dashboard and admin analytics return bounded payloads', async () => {
    const owner = await register(app, `perf-dash-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Perf Dash ${Date.now()}`);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org}/switch`)
      .set('Cookie', owner.cookie)
      .expect(201);

    const dash = await request(app.getHttpServer())
      .get('/api/v1/dashboard/developer')
      .set('Cookie', owner.cookie)
      .query({ organizationPublicId: org })
      .expect(200);
    expect(dash.body).toBeTruthy();

    const admin = await grantAdmin(app, prisma, `perf-admin-${Date.now()}@example.com`);
    const analytics = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Cookie', admin.cookie)
      .query({ period: 'DAYS_30' })
      .expect(200);
    expect(analytics.body).toBeTruthy();
    expect(JSON.stringify(analytics.body).length).toBeLessThan(500_000);
  });

  it('AI context and CRM lists stay paginated', async () => {
    const seeker = await register(app, `perf-ai-${Date.now()}@example.com`, ['PROPERTY_SEEKER']);
    const context = await request(app.getHttpServer())
      .get('/api/v1/ai/context')
      .set('Cookie', seeker.cookie)
      .expect(200);
    expect(Array.isArray(context.body.nextBestActions)).toBe(true);
    expect(context.body.nextBestActions.length).toBeLessThanOrEqual(20);

    const owner = await register(app, `perf-crm-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Perf CRM ${Date.now()}`);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org}/switch`)
      .set('Cookie', owner.cookie)
      .expect(201);

    const contacts = await request(app.getHttpServer())
      .get('/api/v1/crm/contacts')
      .set('Cookie', owner.cookie)
      .query({ organizationPublicId: org, limit: 20 })
      .expect(200);
    const list = contacts.body.contacts ?? contacts.body.items ?? [];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeLessThanOrEqual(20);
  });

  it('requirements and partner docs remain bounded', async () => {
    const seeker = await register(app, `perf-req-${Date.now()}@example.com`, ['PROPERTY_SEEKER']);
    const mine = await request(app.getHttpServer())
      .get('/api/v1/requirements')
      .set('Cookie', seeker.cookie)
      .query({ limit: 20 })
      .expect(200);
    expect(Array.isArray(mine.body.requirements ?? mine.body.items ?? [])).toBe(true);

    const publicReqs = await request(app.getHttpServer())
      .get('/api/v1/public/requirements')
      .query({ limit: 20 })
      .expect(200);
    expect(Array.isArray(publicReqs.body.requirements ?? publicReqs.body.items ?? [])).toBe(true);

    await request(app.getHttpServer()).get('/api/v1/partner/docs').expect(200);
  });
});
