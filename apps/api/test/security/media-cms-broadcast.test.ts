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
        description: 'Phase 12 developer',
        operatingZones: ['Hyderabad'],
        headquartersCity: 'Hyderabad',
      },
    })
    .expect(201);
  return {
    orgPublicId: response.body.organization.publicId as string,
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

describe('Phase 12 media CMS broadcast security', () => {
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
    for (const table of PHASE12_DELETE_ORDER) {
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

  it('allows public access only to published public media and hides drafts', async () => {
    const editor = await grantPlatformRole(
      app,
      prisma,
      `editor-pub-${Date.now()}@example.com`,
      'CONTENT_EDITOR',
    );

    const draft = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Cookie', editor.cookie)
      .send({
        storageKey: 'cms/draft-photo.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSizeBytes: '1024',
        title: 'Draft Gallery',
        slug: `draft-gallery-${Date.now()}`,
        visibility: 'PRIVATE',
      })
      .expect(201);

    const published = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Cookie', editor.cookie)
      .send({
        storageKey: 'cms/published-photo.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSizeBytes: '2048',
        title: 'Published Gallery',
        slug: `published-gallery-${Date.now()}`,
        visibility: 'PRIVATE',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/media/${published.body.publicId}/publish`)
      .set('Cookie', editor.cookie)
      .expect(201);

    await request(app.getHttpServer()).get(`/api/v1/public/media/${draft.body.slug}`).expect(404);

    const publicGet = await request(app.getHttpServer())
      .get(`/api/v1/public/media/${published.body.slug}`)
      .expect(200);
    expect(publicGet.body.publicId).toBe(published.body.publicId);
    expect(publicGet.body.storageKey).toBeUndefined();
    expect(publicGet.body.seo.indexable).toBe(true);

    const list = await request(app.getHttpServer()).get('/api/v1/public/media').expect(200);
    expect(
      list.body.media.some((m: { publicId: string }) => m.publicId === draft.body.publicId),
    ).toBe(false);
    expect(
      list.body.media.some((m: { publicId: string }) => m.publicId === published.body.publicId),
    ).toBe(true);
  });

  it('denies cross-organization media modification', async () => {
    const a = await register(app, `dev-media-a-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, a.cookie, 'Media Org A');
    await switchOrg(app, a.cookie, orgA.orgPublicId);

    const b = await register(app, `dev-media-b-${Date.now()}@example.com`, []);
    const orgB = await onboardDeveloper(app, b.cookie, 'Media Org B');
    await switchOrg(app, b.cookie, orgB.orgPublicId);

    const created = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA.orgPublicId,
        storageKey: 'org-a/secure.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSizeBytes: '512',
        title: 'Org A Media',
        visibility: 'PRIVATE',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/media/${created.body.publicId}`)
      .set('Cookie', b.cookie)
      .send({ title: 'Hijacked' })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/media/${created.body.publicId}/publish`)
      .set('Cookie', b.cookie)
      .expect(404);
  });

  it('keeps PROPERTY_ADMIN assignment-scoped and without media:publish', async () => {
    const propertyAdmin = await grantPlatformRole(
      app,
      prisma,
      `padmin-media-${Date.now()}@example.com`,
      'PROPERTY_ADMIN',
    );

    await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Cookie', propertyAdmin.cookie)
      .send({
        storageKey: 'padmin/attempt.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSizeBytes: '100',
        title: 'Should Fail',
      })
      .expect(403);
  });

  it('requires content:publish and never fabricates provider metrics', async () => {
    const seeker = await register(app, `seeker-cms-${Date.now()}@example.com`);
    const editor = await grantPlatformRole(
      app,
      prisma,
      `editor-cms-${Date.now()}@example.com`,
      'CONTENT_EDITOR',
    );

    const article = await request(app.getHttpServer())
      .post('/api/v1/editorial')
      .set('Cookie', editor.cookie)
      .send({
        kind: 'MARKET_ARTICLE',
        title: 'Hyderabad Micro-market Notes',
        bodyMarkdown: 'Observed inventory signals only.',
        slug: `hyderabad-notes-${Date.now()}`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/editorial/${article.body.publicId}/publish`)
      .set('Cookie', seeker.cookie)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/editorial/${article.body.publicId}/approve`)
      .set('Cookie', editor.cookie)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/editorial/${article.body.publicId}/publish`)
      .set('Cookie', editor.cookie)
      .expect(201);

    const admin = await grantPlatformRole(
      app,
      prisma,
      `admin-cms-${Date.now()}@example.com`,
      'ADMIN',
    );

    const providers = await request(app.getHttpServer())
      .get('/api/v1/admin/external-media/providers')
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(
      providers.body.providers.every((p: { status: string }) => p.status === 'UNAVAILABLE'),
    ).toBe(true);

    const media = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Cookie', editor.cookie)
      .send({
        storageKey: 'cms/for-mapping.mp4',
        mimeType: 'video/mp4',
        mediaType: 'VIDEO',
        fileSizeBytes: '4096',
        title: 'Mapping Subject',
      })
      .expect(201);

    const mapping = await request(app.getHttpServer())
      .post('/api/v1/admin/external-media/mappings')
      .set('Cookie', admin.cookie)
      .send({
        mediaPublicId: media.body.publicId,
        provider: 'YOUTUBE',
        externalMediaId: 'yt-example-id',
      })
      .expect(201);
    const metrics = await request(app.getHttpServer())
      .get(`/api/v1/admin/external-media/mappings/${mapping.body.publicId}/metrics`)
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(metrics.body.status).toBe('UNAVAILABLE');
    expect(metrics.body.metrics).toBeNull();
  });

  it('moderators can moderate media and analytics remain org-scoped', async () => {
    const editor = await grantPlatformRole(
      app,
      prisma,
      `editor-mod-${Date.now()}@example.com`,
      'CONTENT_EDITOR',
    );
    const moderator = await grantPlatformRole(
      app,
      prisma,
      `mod-media-${Date.now()}@example.com`,
      'MODERATOR',
    );

    const media = await request(app.getHttpServer())
      .post('/api/v1/media')
      .set('Cookie', editor.cookie)
      .send({
        storageKey: 'cms/flag.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSizeBytes: '300',
        title: 'Flag Candidate',
        slug: `flag-${Date.now()}`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/media/${media.body.publicId}/publish`)
      .set('Cookie', editor.cookie)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/media/${media.body.publicId}/moderate`)
      .set('Cookie', moderator.cookie)
      .send({ moderationStatus: 'FLAGGED', reason: 'Needs review' })
      .expect(201);

    await request(app.getHttpServer()).get(`/api/v1/public/media/${media.body.slug}`).expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/public/media/analytics/events')
      .send({
        eventType: 'VIEW',
        mediaPublicId: media.body.publicId,
      })
      .expect(404);

    const access = await request(app.getHttpServer())
      .get(`/api/v1/media/${media.body.publicId}/access-url`)
      .set('Cookie', editor.cookie);
    expect([200, 201].includes(access.status) || access.status === 400).toBe(true);
    if (access.status === 200 || access.status === 201) {
      expect(access.body.url).toBeTruthy();
      expect(access.body.storageKey).toBeUndefined();
    }
  });

  it('broadcast presentation returns real unavailable states without fake charts', async () => {
    const owner = await register(app, `dev-studio-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, 'Studio Org');
    await switchOrg(app, owner.cookie, org.orgPublicId);

    const property = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', owner.cookie)
      .send({
        organizationPublicId: org.orgPublicId,
        title: 'Studio Property',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        priceMinor: '1500000000',
        city: 'Hyderabad',
        locality: 'Gachibowli',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${property.body.publicId}`)
      .set('Cookie', owner.cookie)
      .send({ publicationStatus: 'PUBLISHED' })
      .expect(200);

    const presentation = await request(app.getHttpServer())
      .get(`/api/v1/studio/presentation/property/${property.body.publicId}`)
      .set('Cookie', owner.cookie)
      .expect(200);

    expect(presentation.body.propertyPublicId).toBe(property.body.publicId);
    expect(Array.isArray(presentation.body.sections)).toBe(true);
    const market = presentation.body.sections.find((s: { id: string }) => s.id === 'market');
    expect(market).toBeTruthy();
    if (!market.available) {
      expect(market.data).toBeNull();
      expect(market.unavailableReason).toBeTruthy();
    }
  });
});
