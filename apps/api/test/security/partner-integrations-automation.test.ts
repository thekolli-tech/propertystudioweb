import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { newUuid } from '../../src/common/crypto/ids';
import {
  signWebhookPayload,
  verifyWebhookSignature,
} from '../../src/modules/integrations/webhook-signing.util';
import { DomainEventBus } from '../../src/modules/integrations/domain-event-bus.service';
import { WebhooksService } from '../../src/modules/integrations/webhooks.service';
import { NotificationChannelsService } from '../../src/modules/integrations/notification-channels.service';
import { IngestionService } from '../../src/modules/integrations/ingestion.service';
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
        description: 'Phase 13 developer',
        operatingZones: ['Hyderabad'],
        headquartersCity: 'Hyderabad',
      },
    })
    .expect(201);
  return { orgPublicId: response.body.organization.publicId as string };
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

const PHASE13_DELETE_ORDER = [
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
] as const;

const PHASE12_DELETE_ORDER = [
  'media_analytics_events',
  'external_media_mappings',
  'media_collection_items',
  'media_collections',
  'editorial_content_revisions',
  'editorial_contents',
  'creator_profiles',
  'broadcast_studio_configs',
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

describe('Phase 13 partner API integrations automation security', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '1000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
    process.env.PARTNER_RATE_LIMIT_MAX_REQUESTS = '1000';
    process.env.PARTNER_RATE_LIMIT_WINDOW_MS = '60000';
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
    const keys = await redis.client.keys('rate-limit:partner:*');
    if (keys.length > 0) {
      await redis.client.del(...keys);
    }
    await prisma.$executeRawUnsafe(
      'ALTER TABLE audit_events DISABLE TRIGGER audit_events_no_delete',
    );
    await prisma.$executeRawUnsafe('DELETE FROM audit_events');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE audit_events ENABLE TRIGGER audit_events_no_delete',
    );
    for (const table of PHASE13_DELETE_ORDER) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
    for (const table of PHASE12_DELETE_ORDER) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
    for (const table of PHASE11_DELETE_ORDER) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
    for (const table of PHASE10_DELETE_ORDER) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
    await prisma.$executeRawUnsafe('DELETE FROM idempotency_keys');
    await prisma.$executeRawUnsafe('DELETE FROM crm_follow_ups');
    await prisma.$executeRawUnsafe('DELETE FROM crm_activities');
    await prisma.$executeRawUnsafe('DELETE FROM crm_site_visits');
    await prisma.$executeRawUnsafe('DELETE FROM crm_deals');
    await prisma.$executeRawUnsafe('DELETE FROM crm_contacts');
    await prisma.$executeRawUnsafe('DELETE FROM lead_purchases');
    await prisma.$executeRawUnsafe('DELETE FROM lead_access_grants');
    await prisma.$executeRawUnsafe('DELETE FROM leads');
    await prisma.$executeRawUnsafe('DELETE FROM requirements');
    await prisma.$executeRawUnsafe('DELETE FROM sessions');
    await prisma.$executeRawUnsafe('DELETE FROM user_platform_roles');
    await prisma.$executeRawUnsafe('DELETE FROM user_personas');
    await prisma.$executeRawUnsafe('DELETE FROM organization_memberships');
    await prisma.$executeRawUnsafe('DELETE FROM developer_profiles');
    await prisma.$executeRawUnsafe('DELETE FROM agency_profiles');
    await prisma.$executeRawUnsafe('DELETE FROM properties');
    await prisma.$executeRawUnsafe('DELETE FROM projects');
    await prisma.$executeRawUnsafe('DELETE FROM organizations');
    await prisma.$executeRawUnsafe('DELETE FROM users');
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupPartner() {
    const owner = await register(app, `owner-${Date.now()}@example.com`, []);
    const { orgPublicId } = await onboardDeveloper(app, owner.cookie, `Partner Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, orgPublicId);

    const integration = await request(app.getHttpServer())
      .post(`/api/v1/org/${orgPublicId}/integrations`)
      .set('Cookie', owner.cookie)
      .send({
        name: 'Portal Partner',
        integrationType: 'PROPERTY_PORTAL',
        organizationPublicId: orgPublicId,
      })
      .expect(201);

    const client = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${integration.body.publicId}/api-clients`)
      .set('Cookie', owner.cookie)
      .send({
        name: 'Portal Key',
        environment: 'TEST',
        scopes: ['properties:read', 'projects:read', 'inventory:read', 'leads:receive'],
      })
      .expect(201);

    expect(client.body.secret).toMatch(/^ps_test_/);
    expect(client.body.keyPrefix).toBeTruthy();

    return {
      owner,
      orgPublicId,
      integrationPublicId: integration.body.publicId as string,
      apiSecret: client.body.secret as string,
      clientPublicId: client.body.publicId as string,
    };
  }

  it('denies revoked and expired API keys; wrong scope denied; secrets never re-listed', async () => {
    const setup = await setupPartner();

    await request(app.getHttpServer())
      .get('/api/v1/partner/properties')
      .set('Authorization', `Bearer ${setup.apiSecret}`)
      .expect(200);

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/integrations/${setup.integrationPublicId}/api-clients`)
      .set('Cookie', setup.owner.cookie)
      .expect(200);
    expect(listed.body.items[0].secret).toBeUndefined();
    expect(JSON.stringify(listed.body)).not.toContain(setup.apiSecret);

    await request(app.getHttpServer())
      .post(
        `/api/v1/integrations/${setup.integrationPublicId}/api-clients/${setup.clientPublicId}/revoke`,
      )
      .set('Cookie', setup.owner.cookie)
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/partner/properties')
      .set('Authorization', `Bearer ${setup.apiSecret}`)
      .expect(401);

    const fresh = await setupPartner();
    await request(app.getHttpServer())
      .get('/api/v1/partner/leads')
      .set('Authorization', `Bearer ${fresh.apiSecret}`)
      .expect(200);

    // Wrong scope: media:read not granted
    await request(app.getHttpServer())
      .get('/api/v1/partner/docs')
      .set('Authorization', `Bearer ${fresh.apiSecret}`)
      .expect(200);

    const limited = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${fresh.integrationPublicId}/api-clients`)
      .set('Cookie', fresh.owner.cookie)
      .send({
        name: 'Props only',
        environment: 'TEST',
        scopes: ['properties:read'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/partner/projects')
      .set('Authorization', `Bearer ${limited.body.secret}`)
      .expect(403);

    // Expired key
    const expired = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${fresh.integrationPublicId}/api-clients`)
      .set('Cookie', fresh.owner.cookie)
      .send({
        name: 'Expired',
        environment: 'TEST',
        scopes: ['properties:read'],
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      })
      .expect(201);

    await prisma.apiClient.update({
      where: { publicId: expired.body.publicId },
      data: { status: 'EXPIRED' },
    });

    await request(app.getHttpServer())
      .get('/api/v1/partner/properties')
      .set('Authorization', `Bearer ${expired.body.secret}`)
      .expect(401);
  });

  it('blocks cross-tenant partner property access and unentitled private leads', async () => {
    const a = await setupPartner();
    const b = await setupPartner();

    const orgA = await prisma.organization.findFirstOrThrow({
      where: { publicId: a.orgPublicId },
    });
    await prisma.property.create({
      data: {
        id: newUuid(),
        publicId: 'PS-PROP-900001',
        organizationId: orgA.id,
        title: 'Tenant A Home',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        priceMinor: 1_000_000n,
        publicationStatus: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    const listA = await request(app.getHttpServer())
      .get('/api/v1/partner/properties')
      .set('Authorization', `Bearer ${a.apiSecret}`)
      .expect(200);
    expect(
      listA.body.items.some((p: { publicId: string }) => p.publicId === 'PS-PROP-900001'),
    ).toBe(true);

    const listB = await request(app.getHttpServer())
      .get('/api/v1/partner/properties')
      .set('Authorization', `Bearer ${b.apiSecret}`)
      .expect(200);
    expect(
      listB.body.items.some((p: { publicId: string }) => p.publicId === 'PS-PROP-900001'),
    ).toBe(false);

    await request(app.getHttpServer())
      .get('/api/v1/partner/properties/PS-PROP-900001')
      .set('Authorization', `Bearer ${b.apiSecret}`)
      .expect(404);

    // Lead without grant
    const leadId = newUuid();
    await prisma.lead.create({
      data: {
        id: leadId,
        publicId: 'PS-LEAD-900001',
        requirementId: (
          await prisma.requirement.create({
            data: {
              id: newUuid(),
              publicId: 'PS-REQ-900001',
              ownerUserId: (await prisma.user.findFirstOrThrow()).id,
              propertyType: 'APARTMENT',
              transactionType: 'BUY',
              status: 'ACTIVE',
              visibility: 'MARKETPLACE',
              purpose: 'END_USE',
              timeline: 'FLEXIBLE',
              city: 'Hyderabad',
            },
          })
        ).id,
        recipientOrganizationId: orgA.id,
        matchScore: 80,
        matchedCriteria: {},
        unmatchedCriteria: {},
        matchExplanation: 'test',
        status: 'NEW',
      },
    });

    await request(app.getHttpServer())
      .get('/api/v1/partner/leads/PS-LEAD-900001')
      .set('Authorization', `Bearer ${a.apiSecret}`)
      .expect(403);
  });

  it('signs webhooks, rejects replay, never returns webhook secrets, supports dead-letter path', async () => {
    const setup = await setupPartner();
    const webhook = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${setup.integrationPublicId}/webhooks`)
      .set('Cookie', setup.owner.cookie)
      .send({
        url: 'https://example.com/hooks/ps',
        subscribedEvents: ['property.published'],
      })
      .expect(201);

    expect(webhook.body.secret).toMatch(/^whsec_/);
    const listed = await request(app.getHttpServer())
      .get(`/api/v1/integrations/${setup.integrationPublicId}/webhooks`)
      .set('Cookie', setup.owner.cookie)
      .expect(200);
    expect(listed.body.items[0].secret).toBeUndefined();
    expect(JSON.stringify(listed.body)).not.toContain(webhook.body.secret);

    const body = JSON.stringify({ hello: 'world' });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const eventId = 'PS-DEVNT-000001';
    const signature = signWebhookPayload(webhook.body.secret, timestamp, eventId, body);
    const ok = verifyWebhookSignature({
      secret: webhook.body.secret,
      timestamp,
      eventId,
      body,
      signature,
      toleranceSeconds: 300,
    });
    expect(ok.valid).toBe(true);

    const replay = verifyWebhookSignature({
      secret: webhook.body.secret,
      timestamp: String(Math.floor(Date.now() / 1000) - 10_000),
      eventId,
      body,
      signature: signWebhookPayload(
        webhook.body.secret,
        String(Math.floor(Date.now() / 1000) - 10_000),
        eventId,
        body,
      ),
      toleranceSeconds: 300,
    });
    expect(replay.valid).toBe(false);
    expect(replay.reason).toMatch(/replay/i);

    const verifyApi = await request(app.getHttpServer())
      .post('/api/v1/integrations/webhooks/verify-signature')
      .set('Cookie', setup.owner.cookie)
      .send({
        secret: webhook.body.secret,
        timestamp,
        eventId,
        body,
        signature,
      })
      .expect(201);
    expect(verifyApi.body.valid).toBe(true);

    // Force a dead-letter via failed delivery attempts
    const events = app.get(DomainEventBus);
    const org = await prisma.organization.findFirstOrThrow({
      where: { publicId: setup.orgPublicId },
    });
    await events.emit({
      eventType: 'property.published',
      resourceType: 'property',
      resourcePublicId: 'PS-PROP-000099',
      organizationId: org.id,
      payload: { publicId: 'PS-PROP-000099' },
    });

    const webhooks = app.get(WebhooksService);
    // Point endpoint at invalid local URL and exhaust attempts quickly
    await prisma.outboundWebhookEndpoint.updateMany({
      where: { publicId: webhook.body.publicId },
      data: { url: 'http://127.0.0.1:9/fail', maxAttempts: 1 },
    });
    await webhooks.deliverPending(10);

    const deliveries = await request(app.getHttpServer())
      .get(`/api/v1/integrations/${setup.integrationPublicId}/deliveries?failedOnly=true`)
      .set('Cookie', setup.owner.cookie)
      .expect(200);
    expect(deliveries.body.items.length).toBeGreaterThan(0);
    expect(deliveries.body.items[0].status).toBe('DEAD_LETTER');
  });

  it('rate limits partner API; suspended partner blocked; partner cannot hit admin', async () => {
    const setup = await setupPartner();
    const client = await prisma.apiClient.findFirstOrThrow({
      where: { publicId: setup.clientPublicId },
    });
    // Simulate exhausted partner bucket for this client.
    const windowMs = 60_000;
    const bucket = Math.floor(Date.now() / windowMs);
    const key = `rate-limit:partner:${client.id}:${bucket}`;
    await redis.client.set(key, '1000');
    await redis.client.pexpire(key, windowMs);

    await request(app.getHttpServer())
      .get('/api/v1/partner/properties')
      .set('Authorization', `Bearer ${setup.apiSecret}`)
      .expect(429);

    await request(app.getHttpServer())
      .patch(`/api/v1/integrations/${setup.integrationPublicId}`)
      .set('Cookie', setup.owner.cookie)
      .send({ status: 'SUSPENDED' })
      .expect(200);

    // Reset rate limit key by using a new client after suspend check on existing key
    const again = await setupPartner();
    await request(app.getHttpServer())
      .patch(`/api/v1/integrations/${again.integrationPublicId}`)
      .set('Cookie', again.owner.cookie)
      .send({ status: 'SUSPENDED' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/partner/properties')
      .set('Authorization', `Bearer ${again.apiSecret}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/admin/integrations')
      .set('Authorization', `Bearer ${setup.apiSecret}`)
      .expect(401);
  });

  it('notification providers return UNAVAILABLE; ingestion cannot bypass auth; duplicate event delivery is idempotent', async () => {
    const channels = app.get(NotificationChannelsService);
    const email = await channels.sendEmail({
      to: 'a@example.com',
      subject: 'x',
      body: 'y',
    });
    expect(email.status).toBe('UNAVAILABLE');

    const ingestion = app.get(IngestionService);
    expect(ingestion.providerStatus().status).toBe('UNAVAILABLE');

    const stranger = await register(app, `stranger-${Date.now()}@example.com`, ['PROPERTY_SEEKER']);
    await request(app.getHttpServer())
      .post('/api/v1/integrations/external-mappings')
      .set('Cookie', stranger.cookie)
      .send({
        provider: 'portal',
        resourceType: 'PROPERTY',
        externalId: 'ext-1',
      })
      .expect(403);

    const setup = await setupPartner();
    const webhook = await request(app.getHttpServer())
      .post(`/api/v1/integrations/${setup.integrationPublicId}/webhooks`)
      .set('Cookie', setup.owner.cookie)
      .send({
        url: 'https://example.com/hooks',
        subscribedEvents: ['property.updated'],
      })
      .expect(201);

    const events = app.get(DomainEventBus);
    const org = await prisma.organization.findFirstOrThrow({
      where: { publicId: setup.orgPublicId },
    });
    const emitted = await events.emit({
      eventType: 'property.updated',
      resourceType: 'property',
      resourcePublicId: 'PS-PROP-000050',
      organizationId: org.id,
      payload: { publicId: 'PS-PROP-000050' },
    });

    const webhooks = app.get(WebhooksService);
    const first = await webhooks.enqueueDeliveriesForEvent(
      (await prisma.domainEventRecord.findUniqueOrThrow({ where: { publicId: emitted.publicId } }))
        .id,
    );
    const second = await webhooks.enqueueDeliveriesForEvent(
      (await prisma.domainEventRecord.findUniqueOrThrow({ where: { publicId: emitted.publicId } }))
        .id,
    );
    expect(first).toBeGreaterThanOrEqual(0);
    expect(second).toBe(0);

    const count = await prisma.webhookDelivery.count({
      where: { endpoint: { publicId: webhook.body.publicId } },
    });
    expect(count).toBe(1);
  });

  it('admin integrations UI APIs require admin permission; PROPERTY_ADMIN denied', async () => {
    const admin = await grantPlatformRole(app, prisma, `admin-${Date.now()}@example.com`, 'ADMIN');
    const propAdmin = await grantPlatformRole(
      app,
      prisma,
      `prop-admin-${Date.now()}@example.com`,
      'PROPERTY_ADMIN',
    );

    await request(app.getHttpServer())
      .get('/api/v1/admin/integrations')
      .set('Cookie', admin.cookie)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/admin/integrations')
      .set('Cookie', propAdmin.cookie)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/admin/integrations/notification-providers')
      .set('Cookie', admin.cookie)
      .expect(200)
      .expect((res) => {
        expect(
          res.body.providers.every((p: { status: string }) => p.status === 'UNAVAILABLE'),
        ).toBe(true);
      });
  });

  it('usage logs contain no secrets', async () => {
    const setup = await setupPartner();
    await request(app.getHttpServer())
      .get('/api/v1/partner/properties')
      .set('Authorization', `Bearer ${setup.apiSecret}`)
      .expect(200);

    const usage = await prisma.integrationUsageEvent.findMany({ take: 5 });
    expect(usage.length).toBeGreaterThan(0);
    for (const row of usage) {
      expect(JSON.stringify(row)).not.toContain(setup.apiSecret);
      expect(row.path).not.toContain(setup.apiSecret);
    }
  });
});
