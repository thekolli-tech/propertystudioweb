import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { newUuid } from '../../src/common/crypto/ids';

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
        description: 'Phase 11 developer',
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

describe('Phase 11 intelligence AI security', () => {
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
      bathrooms?: number | null;
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
        bathrooms: input.bathrooms === undefined ? 3 : input.bathrooms,
        configuration: input.configuration ?? 'THREE_BHK',
        carpetAreaSqft: input.carpetAreaSqft,
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

  it('denies cross-tenant intelligence access to unpublished property of another org', async () => {
    const owner = await register(app, `dev-intel-a-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, owner.cookie, `Intel Org A ${Date.now()}`);
    await switchOrg(app, owner.cookie, orgA.orgPublicId);
    const propertyPublicId = await createDraftProperty(owner.cookie, orgA.orgPublicId, {
      title: 'Private Draft Villa',
    });

    const other = await register(app, `dev-intel-b-${Date.now()}@example.com`, []);
    const orgB = await onboardDeveloper(app, other.cookie, `Intel Org B ${Date.now()}`);
    await switchOrg(app, other.cookie, orgB.orgPublicId);

    const denied = await request(app.getHttpServer())
      .get(`/api/v1/intelligence/properties/${propertyPublicId}`)
      .set('Cookie', other.cookie)
      .expect(404);
    expect(denied.body.error.code).toBe('NOT_FOUND');
  });

  it('denies unauthorized property intelligence access', async () => {
    const owner = await register(app, `dev-unauth-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Unauth Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org.orgPublicId);
    const propertyPublicId = await createDraftProperty(owner.cookie, org.orgPublicId, {
      title: 'Owner Only Draft',
    });
    await publishProperty(owner.cookie, propertyPublicId);

    await request(app.getHttpServer())
      .get(`/api/v1/intelligence/properties/${propertyPublicId}`)
      .expect(401);

    const noIntel = await grantPlatformRole(
      app,
      prisma,
      `prop-admin-${Date.now()}@example.com`,
      'PROPERTY_ADMIN',
    );
    const forbidden = await request(app.getHttpServer())
      .get(`/api/v1/intelligence/properties/${propertyPublicId}`)
      .set('Cookie', noIntel.cookie)
      .expect(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });

  it('AI tools cannot retrieve unauthorized private property via assistant or match', async () => {
    const owner = await register(app, `dev-ai-priv-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, owner.cookie, `AI Priv Org A ${Date.now()}`);
    await switchOrg(app, owner.cookie, orgA.orgPublicId);
    const privatePublicId = await createDraftProperty(owner.cookie, orgA.orgPublicId, {
      title: 'Secret Private Unit',
      city: 'Hyderabad',
      locality: 'Gachibowli',
      priceMinor: '9990000000',
    });

    const publishedPublicId = await createDraftProperty(owner.cookie, orgA.orgPublicId, {
      title: 'Published Match Unit',
      city: 'Hyderabad',
      locality: 'Gachibowli',
      priceMinor: '1500000000',
    });
    await publishProperty(owner.cookie, publishedPublicId);

    const outsider = await register(app, `seeker-ai-${Date.now()}@example.com`);
    const assistant = await request(app.getHttpServer())
      .post('/api/v1/ai/assistant')
      .set('Cookie', outsider.cookie)
      .send({ message: `Tell me details about ${privatePublicId}` })
      .expect(201);
    expect(assistant.body.coverageState).toBe('UNAVAILABLE');
    expect(JSON.stringify(assistant.body)).not.toMatch(/Secret Private Unit/);
    expect(JSON.stringify(assistant.body.references ?? [])).not.toContain(privatePublicId);

    const match = await request(app.getHttpServer())
      .post('/api/v1/ai/property-match')
      .set('Cookie', outsider.cookie)
      .send({
        criteria: {
          city: 'Hyderabad',
          locality: 'Gachibowli',
          propertyType: 'APARTMENT',
          transactionType: 'BUY',
        },
        limit: 20,
      })
      .expect(201);
    const matchedIds = (match.body.matches as Array<{ propertyPublicId: string }>).map(
      (row) => row.propertyPublicId,
    );
    expect(matchedIds).not.toContain(privatePublicId);
    expect(matchedIds).toContain(publishedPublicId);
  });

  it('AI cannot access another org private documents', async () => {
    const owner = await register(app, `dev-doc-a-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, owner.cookie, `Doc Org A ${Date.now()}`);
    await switchOrg(app, owner.cookie, orgA.orgPublicId);
    const propertyPublicId = await createDraftProperty(owner.cookie, orgA.orgPublicId, {
      title: 'Doc Host Property',
    });

    const document = await request(app.getHttpServer())
      .post('/api/v1/properties/documents')
      .set('Cookie', owner.cookie)
      .send({
        entityType: 'PROPERTY',
        entityPublicId: propertyPublicId,
        storageKey: `organizations/${orgA.orgPublicId}/properties/${propertyPublicId}/documents/private.pdf`,
        mimeType: 'application/pdf',
        documentType: 'BROCHURE',
        title: 'Private Brochure',
        fileSizeBytes: '2048',
        visibility: 'PRIVATE',
      })
      .expect(201);

    const other = await register(app, `dev-doc-b-${Date.now()}@example.com`, []);
    const orgB = await onboardDeveloper(app, other.cookie, `Doc Org B ${Date.now()}`);
    await switchOrg(app, other.cookie, orgB.orgPublicId);

    const denied = await request(app.getHttpServer())
      .post('/api/v1/ai/document-analysis')
      .set('Cookie', other.cookie)
      .send({ documentPublicId: document.body.publicId })
      .expect(404);
    expect(denied.body.error.code).toBe('NOT_FOUND');
  });

  it('public intelligence contains no protected PII', async () => {
    const ownerEmail = `pii-owner-${Date.now()}@example.com`;
    const ownerPhone = '9876543210';
    const owner = await register(app, ownerEmail, []);
    const org = await onboardDeveloper(app, owner.cookie, `PII Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org.orgPublicId);

    await prisma.developerProfile.update({
      where: { publicId: org.profilePublicId },
      data: { contactEmail: ownerEmail, contactPhone: ownerPhone },
    });

    const propertyPublicId = await createDraftProperty(owner.cookie, org.orgPublicId, {
      title: 'Public Intel Listing',
      city: 'Hyderabad',
      locality: 'Tellapur',
    });
    await publishProperty(owner.cookie, propertyPublicId);

    const seeker = await register(app, `pii-seeker-${Date.now()}@example.com`);
    const intel = await request(app.getHttpServer())
      .get(`/api/v1/intelligence/properties/${propertyPublicId}`)
      .set('Cookie', seeker.cookie)
      .expect(200);

    const payload = JSON.stringify(intel.body);
    expect(payload).not.toMatch(/@example\.com/);
    expect(payload).not.toContain(ownerEmail);
    expect(payload).not.toContain(ownerPhone);
    expect(payload).not.toMatch(/\b\d{10}\b/);
    expect(intel.body).not.toHaveProperty('contactEmail');
    expect(intel.body).not.toHaveProperty('contactPhone');
    expect(intel.body).not.toHaveProperty('email');
    expect(intel.body).not.toHaveProperty('phone');
  });

  it('insufficient market data returns INSUFFICIENT_DATA', async () => {
    const seeker = await register(app, `market-${Date.now()}@example.com`);
    const market = await request(app.getHttpServer())
      .get('/api/v1/intelligence/market?city=NonexistentCityXYZ')
      .set('Cookie', seeker.cookie)
      .expect(200);
    expect(market.body.coverageState).toBe('INSUFFICIENT_DATA');
    expect(market.body.snapshots).toEqual([]);

    const trend = await request(app.getHttpServer())
      .get('/api/v1/intelligence/market/trend?city=NonexistentCityXYZ')
      .set('Cookie', seeker.cookie)
      .expect(200);
    expect(trend.body.coverageState).toBe('INSUFFICIENT_DATA');
    expect(trend.body.points).toEqual([]);
  });

  it('valuation does not fabricate estimates when market data is insufficient', async () => {
    const owner = await register(app, `val-owner-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Val Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org.orgPublicId);
    const propertyPublicId = await createDraftProperty(owner.cookie, org.orgPublicId, {
      title: 'No Comps Property',
      city: 'UniqueValCityXYZ',
      locality: 'NoCompsLocality',
    });
    await publishProperty(owner.cookie, propertyPublicId);

    const seeker = await register(app, `val-seeker-${Date.now()}@example.com`);
    const valuation = await request(app.getHttpServer())
      .post('/api/v1/ai/valuation')
      .set('Cookie', seeker.cookie)
      .send({ propertyPublicId })
      .expect(201);

    expect(valuation.body.coverageState).toBe('INSUFFICIENT_DATA');
    expect(valuation.body.lowEstimateMinor).toBeNull();
    expect(valuation.body.highEstimateMinor).toBeNull();
    expect(valuation.body.midpointMinor).toBeNull();
    expect(valuation.body.confidenceBps).toBeNull();
    expect(valuation.body.factors.join(' ')).toMatch(/No market snapshots/i);
  });

  it('comparison handles missing fields as unavailable / INSUFFICIENT_DATA', async () => {
    const owner = await register(app, `cmp-owner-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Cmp Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org.orgPublicId);

    const completeId = await createDraftProperty(owner.cookie, org.orgPublicId, {
      title: 'Complete Compare Unit',
      bedrooms: 3,
      bathrooms: 2,
      carpetAreaSqft: 1450,
      priceMinor: '1200000000',
    });
    const sparseId = await createDraftProperty(owner.cookie, org.orgPublicId, {
      title: 'Sparse Compare Unit',
      bedrooms: null,
      bathrooms: null,
      priceMinor: '1100000000',
    });
    await publishProperty(owner.cookie, completeId);
    await publishProperty(owner.cookie, sparseId);

    const seeker = await register(app, `cmp-seeker-${Date.now()}@example.com`);
    const compare = await request(app.getHttpServer())
      .post('/api/v1/intelligence/compare')
      .set('Cookie', seeker.cookie)
      .send({ subjectType: 'PROPERTY', publicIds: [completeId, sparseId] })
      .expect(201);

    expect(compare.body.coverageState).toBe('INSUFFICIENT_DATA');
    const bedrooms = compare.body.fields.find((field: { key: string }) => field.key === 'bedrooms');
    const pricePerSqft = compare.body.fields.find(
      (field: { key: string }) => field.key === 'pricePerSqftMinor',
    );
    expect(bedrooms).toBeTruthy();
    expect(
      bedrooms.values.find((row: { publicId: string }) => row.publicId === sparseId)?.available,
    ).toBe(false);
    expect(
      pricePerSqft.values.find((row: { publicId: string }) => row.publicId === sparseId)?.available,
    ).toBe(false);
  });

  it('NL search cannot bypass authorization for unpublished inventory', async () => {
    const owner = await register(app, `nl-owner-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `NL Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org.orgPublicId);

    const privateId = await createDraftProperty(owner.cookie, org.orgPublicId, {
      title: 'Hidden NL Target Villa',
      city: 'Hyderabad',
      locality: 'Kokapet',
      bedrooms: 4,
      configuration: 'FOUR_BHK',
      priceMinor: '7770000000',
    });
    const publishedId = await createDraftProperty(owner.cookie, org.orgPublicId, {
      title: 'Visible NL Target Villa',
      city: 'Hyderabad',
      locality: 'Kokapet',
      bedrooms: 4,
      configuration: 'FOUR_BHK',
      priceMinor: '2500000000',
    });
    await publishProperty(owner.cookie, publishedId);

    const seeker = await register(app, `nl-seeker-${Date.now()}@example.com`);
    const search = await request(app.getHttpServer())
      .post('/api/v1/ai/property-search')
      .set('Cookie', seeker.cookie)
      .send({ query: '4BHK apartment in Hyderabad Kokapet', limit: 50 })
      .expect(201);

    const ids = (search.body.properties as Array<{ publicId: string }>).map((row) => row.publicId);
    expect(ids).toContain(publishedId);
    expect(ids).not.toContain(privateId);
    expect(JSON.stringify(search.body)).not.toMatch(/Hidden NL Target Villa/);
  });

  it('AI tool execution respects permissions for users without ai:assistant', async () => {
    const noAssistant = await grantPlatformRole(
      app,
      prisma,
      `no-ai-${Date.now()}@example.com`,
      'PROPERTY_ADMIN',
    );
    const denied = await request(app.getHttpServer())
      .post('/api/v1/ai/assistant')
      .set('Cookie', noAssistant.cookie)
      .send({ message: 'Find 3BHK apartments in Hyderabad' })
      .expect(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
  });
});
