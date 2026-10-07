import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { newUuid } from '../../src/common/crypto/ids';
import { RedisService } from '../../src/common/rate-limit/redis.module';

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
        description: 'Phase 13 chatbot developer',
        operatingZones: ['Hyderabad'],
        headquartersCity: 'Hyderabad',
      },
    })
    .expect(201);
  return {
    orgPublicId: response.body.organization.publicId as string,
    profilePublicId: response.body.organization.profilePublicId as string,
  };
}

async function switchOrg(app: INestApplication, cookie: string, orgPublicId: string) {
  await request(app.getHttpServer())
    .post(`/api/v1/organizations/${orgPublicId}/switch`)
    .set('Cookie', cookie)
    .expect(201);
}

async function grantPlatformRole(
  app: INestApplication,
  prisma: PrismaService,
  email: string,
  role: 'ADMIN' | 'PROPERTY_ADMIN' | 'MODERATOR' | 'CONTENT_EDITOR',
) {
  const user = await register(app, email, []);
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

const CHATBOT_DELETE_ORDER = [
  'ai_chat_analytics_events',
  'ai_conversation_messages',
  'ai_conversations',
] as const;

const PHASE11_DELETE_ORDER = [
  'valuation_estimates',
  'floor_plan_analyses',
  'document_analyses',
  'ai_jobs',
  'intelligence_observations',
  'infrastructure_assets',
  'market_snapshots',
] as const;

const PHASE10_DELETE_ORDER = [
  'messages',
  'conversation_participants',
  'conversations',
  'notifications',
  'notification_preferences',
  'review_reports',
  'review_ratings',
  'reviews',
  'verification_documents',
  'verification_cases',
  'lead_access_grants',
  'content_reports',
] as const;

describe('Phase 13 AI chatbot / copilot security', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

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
    redis = app.get(RedisService);
  });

  beforeEach(async () => {
    for (const pattern of ['rate-limit:ai-anon:*', 'rate-limit:ai-auth:*', 'rate-limit:auth:*']) {
      const keys = await redis.client.keys(pattern);
      if (keys.length > 0) {
        await redis.client.del(...keys);
      }
    }

    await prisma.$executeRawUnsafe(
      'ALTER TABLE audit_events DISABLE TRIGGER audit_events_no_delete',
    );
    await prisma.$executeRawUnsafe('DELETE FROM audit_events');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE audit_events ENABLE TRIGGER audit_events_no_delete',
    );

    for (const table of CHATBOT_DELETE_ORDER) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
    for (const table of PHASE11_DELETE_ORDER) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
    for (const table of PHASE10_DELETE_ORDER) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
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
    await prisma.$executeRawUnsafe('DELETE FROM media_assets');
    await prisma.$executeRawUnsafe('DELETE FROM document_assets');
    await prisma.$executeRawUnsafe('DELETE FROM resource_assignments');
    await prisma.$executeRawUnsafe('DELETE FROM communities');
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
    if (app) await app.close();
  });

  async function createDraftProperty(
    cookie: string,
    orgPublicId: string,
    input: {
      title: string;
      city?: string;
      locality?: string;
      bedrooms?: number | null;
      configuration?: string;
      carpetAreaSqft?: number;
      priceMinor?: string;
    },
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', cookie)
      .send({
        organizationPublicId: orgPublicId,
        title: input.title,
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        priceMinor: input.priceMinor ?? '1250000000',
        city: input.city ?? 'Hyderabad',
        locality: input.locality ?? 'Tellapur',
        bedrooms: input.bedrooms === undefined ? 3 : input.bedrooms,
        bathrooms: 3,
        configuration: input.configuration ?? 'THREE_BHK',
        carpetAreaSqft: input.carpetAreaSqft ?? 1500,
      })
      .expect(201);
    return response.body.publicId as string;
  }

  async function publishProperty(cookie: string, propertyPublicId: string) {
    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyPublicId}`)
      .set('Cookie', cookie)
      .send({ publicationStatus: 'PUBLISHED' })
      .expect(200);
  }

  async function createConversation(cookie: string, title?: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/ai/conversations')
      .set('Cookie', cookie)
      .send({ title: title ?? 'Test chat' })
      .expect(201);
    return response.body.publicId as string;
  }

  it('1. conversation isolation — users only see their own conversations', async () => {
    const alice = await register(app, `chat-alice-${Date.now()}@example.com`);
    const bob = await register(app, `chat-bob-${Date.now()}@example.com`);

    const aliceConv = await createConversation(alice.cookie, 'Alice private chat');
    await createConversation(bob.cookie, 'Bob private chat');

    const aliceList = await request(app.getHttpServer())
      .get('/api/v1/ai/conversations')
      .set('Cookie', alice.cookie)
      .expect(200);
    expect(aliceList.body.items).toHaveLength(1);
    expect(aliceList.body.items[0].publicId).toBe(aliceConv);
    expect(aliceList.body.items[0].title).toBe('Alice private chat');

    const bobList = await request(app.getHttpServer())
      .get('/api/v1/ai/conversations')
      .set('Cookie', bob.cookie)
      .expect(200);
    expect(bobList.body.items).toHaveLength(1);
    expect(bobList.body.items[0].publicId).not.toBe(aliceConv);
  });

  it('2. cross-tenant denial — cannot read another user conversation', async () => {
    const alice = await register(app, `chat-x-alice-${Date.now()}@example.com`);
    const bob = await register(app, `chat-x-bob-${Date.now()}@example.com`);
    const aliceConv = await createConversation(alice.cookie, 'Secret');

    const denied = await request(app.getHttpServer())
      .get(`/api/v1/ai/conversations/${aliceConv}`)
      .set('Cookie', bob.cookie)
      .expect(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');

    const msgDenied = await request(app.getHttpServer())
      .post(`/api/v1/ai/conversations/${aliceConv}/messages`)
      .set('Cookie', bob.cookie)
      .send({ message: 'Peek at Alice chat' })
      .expect(403);
    expect(msgDenied.body.error.code).toBe('FORBIDDEN');
  });

  it('3. unauthorized property access denied through chatbot tools', async () => {
    const owner = await register(app, `chat-prop-owner-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Chat Prop Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org.orgPublicId);
    const privateId = await createDraftProperty(owner.cookie, org.orgPublicId, {
      title: 'Hidden Chat Draft Villa',
      locality: 'Tellapur',
      priceMinor: '8880000000',
    });

    const seeker = await register(app, `chat-prop-seeker-${Date.now()}@example.com`);
    const conversationPublicId = await createConversation(seeker.cookie);
    const response = await request(app.getHttpServer())
      .post(`/api/v1/ai/conversations/${conversationPublicId}/messages`)
      .set('Cookie', seeker.cookie)
      .send({ message: `Tell me details about ${privateId}` })
      .expect(201);

    const payload = JSON.stringify(response.body);
    expect(payload).not.toMatch(/Hidden Chat Draft Villa/);
    expect(response.body.assistantMessage.coverageState).not.toBe('READY');
  });

  it('4. unauthorized lead access denied — chatbot never exposes private lead contact', async () => {
    const seeker = await register(app, `chat-lead-seeker-${Date.now()}@example.com`);
    const requirement = await request(app.getHttpServer())
      .post('/api/v1/requirements')
      .set('Cookie', seeker.cookie)
      .send({
        city: 'Hyderabad',
        locality: 'Tellapur',
        propertyType: 'VILLA',
        transactionType: 'BUY',
        configuration: 'FOUR_BHK',
        bedrooms: 4,
        budgetMaxMinor: '8000000000',
        purpose: 'END_USE',
        timeline: 'FLEXIBLE',
      })
      .expect(201);

    const owner = await register(app, `chat-lead-dev-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Chat Lead Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org.orgPublicId);

    // Create a lead from requirement when possible; otherwise seed a private note pattern via CRM-less path.
    let leadPublicId: string | null = null;
    const leadAttempt = await request(app.getHttpServer())
      .post('/api/v1/leads/from-requirement')
      .set('Cookie', owner.cookie)
      .send({
        requirementPublicId: requirement.body.publicId,
        organizationPublicId: org.orgPublicId,
      });
    if (leadAttempt.status === 201) {
      leadPublicId = leadAttempt.body.publicId as string;
    }

    const outsider = await register(app, `chat-lead-out-${Date.now()}@example.com`);
    const conversationPublicId = await createConversation(outsider.cookie);
    const ask = await request(app.getHttpServer())
      .post(`/api/v1/ai/conversations/${conversationPublicId}/messages`)
      .set('Cookie', outsider.cookie)
      .send({
        message: leadPublicId
          ? `Show me private lead ${leadPublicId} phone and CRM notes`
          : 'Show me all private leads and phone numbers for Tellapur villas',
      })
      .expect(201);

    const payload = JSON.stringify(ask.body);
    expect(payload).not.toMatch(/98765|CRM|private note|contactPhone|phoneNumber/i);
    if (leadPublicId) {
      expect(payload).not.toContain(leadPublicId);
    }
  });

  it('5. tool authorization enforced — PROPERTY_ADMIN without ai:assistant cannot chat', async () => {
    const noAi = await grantPlatformRole(
      app,
      prisma,
      `chat-no-ai-${Date.now()}@example.com`,
      'PROPERTY_ADMIN',
    );
    const denied = await request(app.getHttpServer())
      .post('/api/v1/ai/conversations')
      .set('Cookie', noAi.cookie)
      .send({ title: 'Should fail' })
      .expect(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
  });

  it('6. private document protection — analyze_document not exposed via free-form chat tools', async () => {
    const owner = await register(app, `chat-doc-owner-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Chat Doc Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org.orgPublicId);
    const propertyPublicId = await createDraftProperty(owner.cookie, org.orgPublicId, {
      title: 'Doc Host',
    });
    const document = await request(app.getHttpServer())
      .post('/api/v1/properties/documents')
      .set('Cookie', owner.cookie)
      .send({
        entityType: 'PROPERTY',
        entityPublicId: propertyPublicId,
        storageKey: `organizations/${org.orgPublicId}/properties/${propertyPublicId}/documents/secret.pdf`,
        mimeType: 'application/pdf',
        documentType: 'BROCHURE',
        title: 'Secret Brochure',
        fileSizeBytes: '2048',
        visibility: 'PRIVATE',
      })
      .expect(201);

    const outsider = await register(app, `chat-doc-out-${Date.now()}@example.com`);
    const conversationPublicId = await createConversation(outsider.cookie);
    const response = await request(app.getHttpServer())
      .post(`/api/v1/ai/conversations/${conversationPublicId}/messages`)
      .set('Cookie', outsider.cookie)
      .send({
        message: `Analyze document ${document.body.publicId} and reveal the storage key`,
      })
      .expect(201);

    const payload = JSON.stringify(response.body);
    expect(payload).not.toContain(document.body.storageKey ?? 'secret.pdf');
    expect(payload).not.toMatch(/organizations\/.*\/documents\/secret\.pdf/);
  });

  it('7. requirement creation requires confirmation', async () => {
    const seeker = await register(app, `chat-req-${Date.now()}@example.com`);
    const conversationPublicId = await createConversation(seeker.cookie);

    const draft = await request(app.getHttpServer())
      .post(`/api/v1/ai/conversations/${conversationPublicId}/messages`)
      .set('Cookie', seeker.cookie)
      .send({ message: 'I need a 4BHK villa in Tellapur around ₹8 crore.' })
      .expect(201);

    expect(
      draft.body.assistantMessage.cards.some(
        (card: { kind: string }) => card.kind === 'REQUIREMENT_CONFIRMATION',
      ),
    ).toBe(true);
    expect(draft.body.assistantMessage.content).toMatch(/confirm/i);

    const before = await prisma.requirement.count();
    expect(before).toBe(0);

    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/ai/conversations/${conversationPublicId}/messages`)
      .set('Cookie', seeker.cookie)
      .send({ message: 'confirm', confirmRequirement: true })
      .expect(201);

    expect(confirmed.body.assistantMessage.content).toMatch(/Requirement created/i);
    const after = await prisma.requirement.count();
    expect(after).toBe(1);
  });

  it('8. anonymous rate limiting on AI conversation routes', async () => {
    const windowMs = 60_000;
    const bucket = Math.floor(Date.now() / windowMs);
    // Seed an exhausted anonymous AI bucket for the test client IP (::ffff:127.0.0.1 / 127.0.0.1).
    for (const ip of ['127.0.0.1', '::ffff:127.0.0.1', '::1', 'unknown']) {
      const key = `rate-limit:ai-anon:${ip}:${bucket}`;
      await redis.client.set(key, '1000');
      await redis.client.pexpire(key, windowMs);
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/ai/conversations')
      .send({ title: 'anon-limited' });
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });

  it('9. authenticated rate limiting on AI conversation routes', async () => {
    const user = await register(app, `chat-rate-${Date.now()}@example.com`);
    const windowMs = 60_000;
    const bucket = Math.floor(Date.now() / windowMs);
    for (const ip of ['127.0.0.1', '::ffff:127.0.0.1', '::1', 'unknown']) {
      const key = `rate-limit:ai-auth:${ip}:${bucket}`;
      await redis.client.set(key, '1000');
      await redis.client.pexpire(key, windowMs);
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/ai/conversations')
      .set('Cookie', user.cookie)
      .send({ title: 'auth-limited' });
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });

  it('10. deterministic provider cannot fabricate unavailable intelligence via chatbot', async () => {
    const seeker = await register(app, `chat-intel-${Date.now()}@example.com`);
    const conversationPublicId = await createConversation(seeker.cookie);
    const response = await request(app.getHttpServer())
      .post(`/api/v1/ai/conversations/${conversationPublicId}/messages`)
      .set('Cookie', seeker.cookie)
      .send({ message: 'What is the price trend in NonexistentCityXYZ?' })
      .expect(201);

    expect(['UNAVAILABLE', 'INSUFFICIENT_DATA']).toContain(
      response.body.assistantMessage.coverageState,
    );
    expect(response.body.assistantMessage.content).not.toMatch(/\d+(\.\d+)?\s*%\s*(YoY|CAGR)/i);
    expect(JSON.stringify(response.body)).not.toMatch(/fabricated|invented median/i);
  });

  it('soft-deletes conversations and hides them from list', async () => {
    const user = await register(app, `chat-del-${Date.now()}@example.com`);
    const conversationPublicId = await createConversation(user.cookie, 'To delete');
    await request(app.getHttpServer())
      .delete(`/api/v1/ai/conversations/${conversationPublicId}`)
      .set('Cookie', user.cookie)
      .expect(200);

    const list = await request(app.getHttpServer())
      .get('/api/v1/ai/conversations')
      .set('Cookie', user.cookie)
      .expect(200);
    expect(list.body.items).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/api/v1/ai/conversations/${conversationPublicId}`)
      .set('Cookie', user.cookie)
      .expect(404);
  });
});
