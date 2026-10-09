import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
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
        description: 'Phase 14B developer',
        operatingZones: ['Bengaluru'],
        headquartersCity: 'Bengaluru',
      },
    })
    .expect(201);
  return response.body.organization.publicId as string;
}

async function switchOrg(app: INestApplication, cookie: string, orgPublicId: string) {
  await request(app.getHttpServer())
    .post(`/api/v1/organizations/${orgPublicId}/switch`)
    .set('Cookie', cookie)
    .expect(201);
}

describe('Phase 14B discovery, saved searches & smart alerts security', () => {
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
      'properties',
      'projects',
      'project_claims',
      'verification_documents',
      'verification_cases',
      'financial_transactions',
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

  async function createAndPublishProperty(
    cookie: string,
    orgPublicId: string,
    title: string,
    city = 'Bengaluru',
  ) {
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', cookie)
      .send({
        organizationPublicId: orgPublicId,
        title,
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        configuration: 'TWO_BHK',
        bedrooms: 2,
        bathrooms: 2,
        priceMinor: '850000000',
        currency: 'INR',
        city,
        locality: 'Indiranagar',
        state: 'Karnataka',
        countryCode: 'IN',
      })
      .expect(201);

    const publicId = create.body.publicId as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${publicId}`)
      .set('Cookie', cookie)
      .send({ publicationStatus: 'PUBLISHED' })
      .expect(200);
    return publicId;
  }

  it('1. public discovery returns published inventory with sort and facets', async () => {
    const dev = await register(app, `dev-disc-${Date.now()}@example.com`, []);
    const orgPublicId = await onboardDeveloper(app, dev.cookie, `Dev Disc ${Date.now()}`);
    await switchOrg(app, dev.cookie, orgPublicId);
    await createAndPublishProperty(dev.cookie, orgPublicId, 'Facet Tower A');
    await createAndPublishProperty(dev.cookie, orgPublicId, 'Facet Tower B');

    const response = await request(app.getHttpServer())
      .get('/api/v1/public/discovery/properties')
      .query({ sort: 'price_asc', includeFacets: true, city: 'Bengaluru' })
      .expect(200);

    expect(response.body.properties.length).toBeGreaterThanOrEqual(2);
    expect(response.body.sort).toBe('price_asc');
    expect(response.body.facets).toBeTruthy();
    expect(response.body.facets.cities.length).toBeGreaterThan(0);
  });

  it('2. saved search is user-owned; other users get NOT_FOUND', async () => {
    const a = await register(app, `seeker-a-${Date.now()}@example.com`);
    const b = await register(app, `seeker-b-${Date.now()}@example.com`);

    const created = await request(app.getHttpServer())
      .post('/api/v1/saved-searches')
      .set('Cookie', a.cookie)
      .send({
        name: 'Bengaluru 2BHK',
        criteria: { city: 'Bengaluru', bedrooms: 2 },
        alertFrequency: 'OFF',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/saved-searches/${created.body.publicId}`)
      .set('Cookie', a.cookie)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/saved-searches/${created.body.publicId}`)
      .set('Cookie', b.cookie)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/saved-searches/${created.body.publicId}`)
      .set('Cookie', b.cookie)
      .send({ name: 'Hijack' })
      .expect(404);
  });

  it('3. saved property requires published inventory and is isolated', async () => {
    const dev = await register(app, `dev-save-${Date.now()}@example.com`, []);
    const orgPublicId = await onboardDeveloper(app, dev.cookie, `Dev Save ${Date.now()}`);
    await switchOrg(app, dev.cookie, orgPublicId);
    const propertyPublicId = await createAndPublishProperty(
      dev.cookie,
      orgPublicId,
      'Bookmarkable Flat',
    );

    const seeker = await register(app, `seeker-save-${Date.now()}@example.com`);
    const other = await register(app, `seeker-other-${Date.now()}@example.com`);

    const saved = await request(app.getHttpServer())
      .post('/api/v1/saved-properties')
      .set('Cookie', seeker.cookie)
      .send({ propertyPublicId })
      .expect(201);

    expect(saved.body.propertyPublicId).toBe(propertyPublicId);

    const list = await request(app.getHttpServer())
      .get('/api/v1/saved-properties')
      .set('Cookie', seeker.cookie)
      .expect(200);
    expect(list.body.savedProperties).toHaveLength(1);

    const otherList = await request(app.getHttpServer())
      .get('/api/v1/saved-properties')
      .set('Cookie', other.cookie)
      .expect(200);
    expect(otherList.body.savedProperties).toHaveLength(0);

    await request(app.getHttpServer())
      .delete(`/api/v1/saved-properties/${saved.body.publicId}`)
      .set('Cookie', other.cookie)
      .expect(404);
  });

  it('4. smart alert creates SAVED_SEARCH_MATCH notification on publish', async () => {
    const seeker = await register(app, `seeker-alert-${Date.now()}@example.com`);
    await request(app.getHttpServer())
      .post('/api/v1/saved-searches')
      .set('Cookie', seeker.cookie)
      .send({
        name: 'Alert Bengaluru',
        criteria: { city: 'Bengaluru', propertyType: 'APARTMENT' },
        alertFrequency: 'IMMEDIATE',
      })
      .expect(201);

    const dev = await register(app, `dev-alert-${Date.now()}@example.com`, []);
    const orgPublicId = await onboardDeveloper(app, dev.cookie, `Dev Alert ${Date.now()}`);
    await switchOrg(app, dev.cookie, orgPublicId);
    const propertyPublicId = await createAndPublishProperty(
      dev.cookie,
      orgPublicId,
      'Alert Match Residence',
    );

    const notifications = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Cookie', seeker.cookie)
      .expect(200);

    const matchNotes = notifications.body.notifications.filter(
      (n: { type: string }) => n.type === 'SAVED_SEARCH_MATCH',
    );
    expect(matchNotes.length).toBeGreaterThanOrEqual(1);

    const matches = await request(app.getHttpServer())
      .get('/api/v1/saved-searches/matches')
      .set('Cookie', seeker.cookie)
      .expect(200);
    expect(
      matches.body.matches.some(
        (m: { propertyPublicId: string }) => m.propertyPublicId === propertyPublicId,
      ),
    ).toBe(true);

    const property = await prisma.property.findFirstOrThrow({
      where: { publicId: propertyPublicId },
    });
    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyPublicId}`)
      .set('Cookie', dev.cookie)
      .send({ title: 'Alert Match Residence Updated', expectedVersion: property.version })
      .expect(200);

    const matchCount = await prisma.savedSearchMatch.count({
      where: { propertyId: property.id },
    });
    expect(matchCount).toBe(1);
  });

  it('5. unauthenticated users cannot create saved searches', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/saved-searches')
      .send({
        name: 'Anon',
        criteria: { city: 'Pune' },
      })
      .expect(401);
  });

  it('6. running a saved search returns discovery results', async () => {
    const dev = await register(app, `dev-run-${Date.now()}@example.com`, []);
    const orgPublicId = await onboardDeveloper(app, dev.cookie, `Dev Run ${Date.now()}`);
    await switchOrg(app, dev.cookie, orgPublicId);
    await createAndPublishProperty(dev.cookie, orgPublicId, 'Runnable Listing', 'Hyderabad');

    const seeker = await register(app, `seeker-run-${Date.now()}@example.com`);
    const created = await request(app.getHttpServer())
      .post('/api/v1/saved-searches')
      .set('Cookie', seeker.cookie)
      .send({
        name: 'Hyderabad hunt',
        criteria: { city: 'Hyderabad' },
      })
      .expect(201);

    const run = await request(app.getHttpServer())
      .post(`/api/v1/saved-searches/${created.body.publicId}/run`)
      .set('Cookie', seeker.cookie)
      .expect(201);

    expect(run.body.savedSearchPublicId).toBe(created.body.publicId);
    expect(run.body.result.properties.length).toBeGreaterThanOrEqual(1);
  });
});
