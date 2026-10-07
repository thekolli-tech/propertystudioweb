import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { newUuid } from '../../src/common/crypto/ids';
import { PrismaService } from '../../src/common/prisma/prisma.module';

function extractSessionCookie(setCookie: string[] | undefined): string | undefined {
  if (!setCookie) return undefined;
  const match = setCookie.find((value) => value.startsWith('ps_session='));
  return match?.split(';')[0];
}

async function register(
  app: INestApplication,
  email: string,
  personas: string[] = ['PROPERTY_SEEKER'],
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password: 'CorrectHorseBattery!', personas })
    .expect(201);
  const cookie = extractSessionCookie(response.headers['set-cookie']);
  expect(cookie).toBeTruthy();
  return { cookie: cookie!, publicId: response.body.user.publicId as string };
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
        description: 'Phase 14D admin control developer',
        operatingZones: ['Hyderabad'],
        headquartersCity: 'Hyderabad',
      },
    })
    .expect(201);
  return response.body.organization.publicId as string;
}

async function onboardAgency(app: INestApplication, cookie: string, name: string) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/organizations/onboard')
    .set('Cookie', cookie)
    .send({
      type: 'AGENCY',
      name,
      profile: {
        legalName: `${name} Legal`,
        displayName: name,
        description: 'Phase 14D agency',
        operatingZones: ['Hyderabad'],
        headquartersCity: 'Hyderabad',
      },
    })
    .expect(201);
  return response.body.organization.publicId as string;
}

async function grantPlatformRole(
  app: INestApplication,
  prisma: PrismaService,
  email: string,
  role: 'ADMIN' | 'PROPERTY_ADMIN' | 'SUPER_ADMIN',
  personas: string[] = [],
) {
  const user = await register(app, email, personas);
  await prisma.userPlatformRole.create({
    data: {
      id: newUuid(),
      userId: (await prisma.user.findFirstOrThrow({ where: { publicId: user.publicId } })).id,
      role,
    },
  });
  await request(app.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', user.cookie);
  const relogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: 'CorrectHorseBattery!' })
    .expect(201);
  const cookie = extractSessionCookie(relogin.headers['set-cookie'])!;
  return { ...user, cookie };
}

describe('Phase 14D Admin Control Center security', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '1000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
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
      'saved_search_matches',
      'saved_searches',
      'saved_properties',
      'ai_chat_analytics_events',
      'ai_conversation_messages',
      'ai_conversations',
      'integration_usage_events',
      'webhook_deliveries',
      'outbound_webhook_endpoints',
      'api_clients',
      'partner_integrations',
      'domain_events',
      'background_jobs',
      'dead_letter_events',
      'external_resource_mappings',
      'automation_rules',
      'crm_activities',
      'crm_follow_ups',
      'crm_site_visits',
      'crm_deals',
      'crm_contacts',
      'lead_purchases',
      'lead_access_grants',
      'leads',
      'requirements',
      'notifications',
      'notification_preferences',
      'messages',
      'conversation_participants',
      'conversations',
      'resource_assignments',
      'media_analytics_events',
      'media_assets',
      'document_assets',
      'properties',
      'projects',
      'communities',
      'verification_documents',
      'verification_cases',
      'review_reports',
      'review_ratings',
      'reviews',
      'content_reports',
      'refunds',
      'invoice_items',
      'invoices',
      'wallet_ledger_entries',
      'wallets',
      'financial_transactions',
      'payment_webhook_events',
      'organization_subscriptions',
      'plan_entitlements',
      'subscription_plans',
      'developer_profiles',
      'agency_profiles',
      'organization_memberships',
      'organizations',
      'sessions',
      'refresh_tokens',
      'idempotency_keys',
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

  it('1. PROPERTY_ADMIN cannot access admin dashboard APIs', async () => {
    const admin = await grantPlatformRole(
      app,
      prisma,
      `padmin-${Date.now()}@example.com`,
      'PROPERTY_ADMIN',
    );
    await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Cookie', admin.cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/system/health')
      .set('Cookie', admin.cookie)
      .expect(403);
  });

  it('2. Developer cannot access admin dashboard APIs', async () => {
    const dev = await register(app, `dev-${Date.now()}@example.com`, []);
    await onboardDeveloper(app, dev.cookie, `Dev Org ${Date.now()}`);
    await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Cookie', dev.cookie)
      .expect(403);
  });

  it('3. Agent cannot access admin dashboard APIs', async () => {
    const agent = await register(app, `agent-${Date.now()}@example.com`, []);
    await onboardAgency(app, agent.cookie, `Agency ${Date.now()}`);
    await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Cookie', agent.cookie)
      .expect(403);
  });

  it('4. Property seeker cannot access admin dashboard APIs', async () => {
    const seeker = await register(app, `seeker-${Date.now()}@example.com`);
    await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Cookie', seeker.cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/ai/governance')
      .set('Cookie', seeker.cookie)
      .expect(403);
  });

  it('5-6. Admin dashboard returns aggregates without secrets / PII blobs', async () => {
    const admin = await grantPlatformRole(app, prisma, `admin-${Date.now()}@example.com`, 'ADMIN');
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .query({ period: 'DAYS_30' })
      .set('Cookie', admin.cookie)
      .expect(200);

    expect(response.body.timezone).toBe('Asia/Kolkata');
    expect(response.body.users.total.coverageState).toMatch(/READY|ZERO/);
    expect(response.body.users.activeUsers.coverageState).toBe('UNAVAILABLE');
    expect(response.body.money.paymentVolumeCapturedMinor.unit).toBe('money_minor');
    expect(response.body.funnel.some((step: { key: string }) => step.key === 'discovery')).toBe(
      true,
    );
    expect(
      response.body.funnel.find((step: { key: string }) => step.key === 'discovery').coverageState,
    ).toBe('UNAVAILABLE');

    const payload = JSON.stringify(response.body);
    expect(payload).not.toMatch(/password|keyHash|secretCiphertext|RAZORPAY|refreshToken/i);
    expect(payload).not.toMatch(/content":"|messages":\[/);
  });

  it('7. Audit events are listable but immutable via admin APIs', async () => {
    const admin = await grantPlatformRole(
      app,
      prisma,
      `audit-admin-${Date.now()}@example.com`,
      'ADMIN',
    );
    await prisma.auditEvent.create({
      data: {
        id: newUuid(),
        action: 'authorization.denied',
        resourceType: 'admin_dashboard',
        resourceId: 'test',
        metadata: { reason: 'probe', password: 'should-not-leak', apiKey: 'x' },
      },
    });

    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/audit')
      .query({ securityOnly: true })
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
    expect(list.body.items[0].metadataKeys).toContain('reason');
    expect(list.body.items[0].metadataKeys).not.toContain('password');
    expect(list.body.items[0].metadataKeys).not.toContain('apiKey');
    expect(JSON.stringify(list.body)).not.toMatch(/should-not-leak/);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/audit/${list.body.items[0].id}`)
      .set('Cookie', admin.cookie)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/audit/${list.body.items[0].id}`)
      .set('Cookie', admin.cookie)
      .send({ action: 'mutated' })
      .expect(404);
  });

  it('8-9. Billing/integration analytics do not expose credentials; AI hides conversation content', async () => {
    const admin = await grantPlatformRole(
      app,
      prisma,
      `money-admin-${Date.now()}@example.com`,
      'ADMIN',
    );
    const dash = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(dash.body.money.walletBalancesMinor.unit).toBe('money_minor');
    expect(dash.body.integrations.activeApiClients.key).toBe('integrations.apiClients');

    const ai = await request(app.getHttpServer())
      .get('/api/v1/admin/ai/governance')
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(ai.body.providerName).toBe('DeterministicAiProvider');
    expect(ai.body.note).toMatch(/Private conversation content/i);
    expect(JSON.stringify(ai.body)).not.toMatch(/"content"|Ask the copilot|USER"|ASSISTANT"/);
  });

  it('10-12. System health is read-only; date ranges work; empty states truthful', async () => {
    const admin = await grantPlatformRole(
      app,
      prisma,
      `health-admin-${Date.now()}@example.com`,
      'ADMIN',
    );

    const health = await request(app.getHttpServer())
      .get('/api/v1/admin/system/health')
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(['HEALTHY', 'DEGRADED', 'UNAVAILABLE']).toContain(health.body.overall);
    expect(health.body.components.some((c: { key: string }) => c.key === 'postgres')).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/admin/system/health/restart')
      .set('Cookie', admin.cookie)
      .expect(404);

    const today = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .query({ period: 'TODAY' })
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(today.body.period).toBe('TODAY');
    expect(today.body.users.newInPeriod.coverageState).toMatch(/READY|ZERO/);

    // Empty CRM metrics remain ZERO rather than fabricated percentages.
    expect(today.body.crm.openFollowUps.coverageState).toMatch(/READY|ZERO/);
    expect(today.body.crm.openFollowUps.value).toBe(0);
  });

  it('AI permissions remain unchanged for seekers after admin integration', async () => {
    const seeker = await register(app, `ai-seeker-${Date.now()}@example.com`);
    const conversation = await request(app.getHttpServer())
      .post('/api/v1/ai/conversations')
      .set('Cookie', seeker.cookie)
      .send({ title: 'Still works' })
      .expect(201);
    expect(conversation.body.publicId).toMatch(/^PS-ACONV-/);

    await request(app.getHttpServer())
      .get('/api/v1/admin/ai/governance')
      .set('Cookie', seeker.cookie)
      .expect(403);
  });
});
