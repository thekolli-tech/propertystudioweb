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
): Promise<{ cookie: string; publicId: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email,
      password: 'CorrectHorseBattery!',
      personas: [],
    })
    .expect(201);
  const cookie = extractSessionCookie(response.headers['set-cookie']);
  expect(cookie).toBeTruthy();
  return { cookie: cookie!, publicId: response.body.user.publicId };
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
        description: 'Test developer',
        operatingZones: ['Bengaluru'],
      },
    })
    .expect(201);
  return response.body.organization.publicId as string;
}

describe('Phase 5 catalog foundation', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE audit_events DISABLE TRIGGER audit_events_no_delete',
    );
    await prisma.$executeRawUnsafe('DELETE FROM audit_events');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE audit_events ENABLE TRIGGER audit_events_no_delete',
    );
    await prisma.$executeRawUnsafe('DELETE FROM messages');
    await prisma.$executeRawUnsafe('DELETE FROM conversation_participants');
    await prisma.$executeRawUnsafe('DELETE FROM conversations');
    await prisma.$executeRawUnsafe('DELETE FROM notifications');
    await prisma.$executeRawUnsafe('DELETE FROM notification_preferences');
    await prisma.$executeRawUnsafe('DELETE FROM review_reports');
    await prisma.$executeRawUnsafe('DELETE FROM review_ratings');
    await prisma.$executeRawUnsafe('DELETE FROM reviews');
    await prisma.$executeRawUnsafe('DELETE FROM verification_documents');
    await prisma.$executeRawUnsafe('DELETE FROM verification_cases');
    await prisma.$executeRawUnsafe('DELETE FROM lead_access_grants');
    await prisma.$executeRawUnsafe('DELETE FROM content_reports');
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

  it('enforces cross-tenant isolation for projects and properties', async () => {
    const a = await register(app, 'dev-a@example.com');
    const b = await register(app, 'dev-b@example.com');
    const orgA = await onboardDeveloper(app, a.cookie, 'Dev A Org');
    const orgB = await onboardDeveloper(app, b.cookie, 'Dev B Org');

    const projectA = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        name: 'Skyline Towers',
        projectType: 'RESIDENTIAL',
        city: 'Bengaluru',
      })
      .expect(201);

    const propertyA = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        projectPublicId: projectA.body.publicId,
        title: '3BHK Ocean View',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        priceMinor: '1250000000',
        city: 'Bengaluru',
      })
      .expect(201);

    expect(projectA.body.publicId).toMatch(/^PS-PROJ-\d+$/);
    expect(propertyA.body.publicId).toMatch(/^PS-PROP-\d+$/);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectA.body.publicId}`)
      .set('Cookie', b.cookie)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectA.body.publicId}`)
      .set('Cookie', b.cookie)
      .send({ name: 'Hijacked' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectA.body.publicId}`)
      .set('Cookie', b.cookie)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/properties/${propertyA.body.publicId}`)
      .set('Cookie', b.cookie)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyA.body.publicId}`)
      .set('Cookie', b.cookie)
      .send({ title: 'Hijacked' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/v1/properties/${propertyA.body.publicId}`)
      .set('Cookie', b.cookie)
      .expect(404);

    // Org B cannot use Org A id to mutate.
    await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', b.cookie)
      .send({
        organizationPublicId: orgA,
        name: 'Cross create',
        projectType: 'RESIDENTIAL',
      })
      .expect(404);
  });

  it('keeps drafts private and publishes for public discovery without leaking internals', async () => {
    const a = await register(app, 'publisher@example.com');
    const orgA = await onboardDeveloper(app, a.cookie, 'Publisher Org');

    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        name: 'Draft Project',
        projectType: 'RESIDENTIAL',
        city: 'Pune',
      })
      .expect(201);

    const property = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        projectPublicId: project.body.publicId,
        title: 'Draft Flat',
        propertyType: 'APARTMENT',
        priceMinor: '500000000',
        city: 'Pune',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/public/projects')
      .expect(200)
      .expect((res) => {
        expect(res.body.projects).toHaveLength(0);
      });
    await request(app.getHttpServer())
      .get(`/api/v1/public/projects/${project.body.publicId}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/public/properties')
      .expect(200)
      .expect((res) => {
        expect(res.body.properties).toHaveLength(0);
      });
    await request(app.getHttpServer())
      .get(`/api/v1/public/properties/${property.body.publicId}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${project.body.publicId}`)
      .set('Cookie', a.cookie)
      .send({ lifecycleStatus: 'PUBLISHED' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${property.body.publicId}`)
      .set('Cookie', a.cookie)
      .send({ publicationStatus: 'PUBLISHED' })
      .expect(200);

    const publicProject = await request(app.getHttpServer())
      .get(`/api/v1/public/projects/${project.body.publicId}`)
      .expect(200);
    const publicProperty = await request(app.getHttpServer())
      .get(`/api/v1/public/properties/${property.body.publicId}`)
      .expect(200);

    expect(publicProject.body.publicId).toBe(project.body.publicId);
    expect(publicProperty.body.publicId).toBe(property.body.publicId);
    expect(JSON.stringify(publicProject.body)).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    expect(JSON.stringify(publicProperty.body)).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    expect(publicProject.body).not.toHaveProperty('organizationId');
    expect(publicProperty.body).not.toHaveProperty('organizationId');
    expect(publicProject.body).not.toHaveProperty('organizationPublicId');
    expect(publicProperty.body).not.toHaveProperty('organizationPublicId');
    expect(publicProject.body).not.toHaveProperty('contactEmail');
    expect(publicProperty.body).not.toHaveProperty('contactPhone');

    const listed = await request(app.getHttpServer()).get('/api/v1/public/projects').expect(200);
    expect(
      listed.body.projects.some(
        (row: { publicId: string }) => row.publicId === project.body.publicId,
      ),
    ).toBe(true);
  });

  it('enforces PROPERTY_ADMIN resource assignments and denies unassigned access', async () => {
    const owner = await register(app, 'owner-admin@example.com');
    const adminUser = await register(app, 'property-admin@example.com');
    const orgA = await onboardDeveloper(app, owner.cookie, 'Assignment Org');

    const property = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', owner.cookie)
      .send({
        organizationPublicId: orgA,
        title: 'Assigned Unit',
        propertyType: 'APARTMENT',
        priceMinor: '100000000',
      })
      .expect(201);

    const otherProperty = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', owner.cookie)
      .send({
        organizationPublicId: orgA,
        title: 'Unassigned Unit',
        propertyType: 'APARTMENT',
        priceMinor: '200000000',
      })
      .expect(201);

    const ownerRow = await prisma.user.findFirstOrThrow({ where: { publicId: owner.publicId } });
    const adminRow = await prisma.user.findFirstOrThrow({
      where: { publicId: adminUser.publicId },
    });
    const propertyRow = await prisma.property.findFirstOrThrow({
      where: { publicId: property.body.publicId },
    });

    await prisma.userPlatformRole.create({
      data: {
        id: newUuid(),
        userId: adminRow.id,
        role: 'PROPERTY_ADMIN',
        createdBy: ownerRow.id,
      },
    });
    await prisma.resourceAssignment.create({
      data: {
        id: newUuid(),
        userId: adminRow.id,
        organizationId: propertyRow.organizationId,
        resourceType: 'PROPERTY',
        resourceId: propertyRow.id,
        createdBy: ownerRow.id,
      },
    });

    // Re-login so session picks up platform role.
    await request(app.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', adminUser.cookie);
    const relogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'property-admin@example.com', password: 'CorrectHorseBattery!' })
      .expect(201);
    const adminCookie = extractSessionCookie(relogin.headers['set-cookie'])!;

    await request(app.getHttpServer())
      .get(`/api/v1/properties/${property.body.publicId}`)
      .set('Cookie', adminCookie)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/properties/${otherProperty.body.publicId}`)
      .set('Cookie', adminCookie)
      .expect(404);
  });

  it('denies cross-tenant media/document access and public-id bypass attempts', async () => {
    const a = await register(app, 'media-a@example.com');
    const b = await register(app, 'media-b@example.com');
    const orgA = await onboardDeveloper(app, a.cookie, 'Media Org A');
    await onboardDeveloper(app, b.cookie, 'Media Org B');

    const property = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        title: 'Media Property',
        propertyType: 'APARTMENT',
        priceMinor: '111000000',
      })
      .expect(201);

    const media = await request(app.getHttpServer())
      .post('/api/v1/properties/media')
      .set('Cookie', a.cookie)
      .send({
        entityType: 'PROPERTY',
        entityPublicId: property.body.publicId,
        storageKey: 'organizations/PS-ORG-1/properties/PS-PROP-1/media/hero.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'IMAGE',
        fileSizeBytes: '1024',
        visibility: 'PRIVATE',
      })
      .expect(201);

    const document = await request(app.getHttpServer())
      .post('/api/v1/properties/documents')
      .set('Cookie', a.cookie)
      .send({
        entityType: 'PROPERTY',
        entityPublicId: property.body.publicId,
        storageKey: 'organizations/PS-ORG-1/properties/PS-PROP-1/documents/brochure.pdf',
        mimeType: 'application/pdf',
        documentType: 'BROCHURE',
        title: 'Brochure',
        fileSizeBytes: '2048',
        visibility: 'PRIVATE',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/media/${media.body.publicId}`)
      .set('Cookie', b.cookie)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/documents/${document.body.publicId}`)
      .set('Cookie', b.cookie)
      .expect(404);

    // Guessing another public ID shape cannot bypass auth.
    await request(app.getHttpServer())
      .get('/api/v1/properties/PS-PROP-999999')
      .set('Cookie', b.cookie)
      .expect(404);
  });

  it('archives/deletes projects without destroying linked properties', async () => {
    const a = await register(app, 'archive@example.com');
    const orgA = await onboardDeveloper(app, a.cookie, 'Archive Org');

    const project = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        name: 'To Archive',
        projectType: 'MIXED_USE',
      })
      .expect(201);

    const property = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        projectPublicId: project.body.publicId,
        title: 'Surviving Unit',
        propertyType: 'APARTMENT',
        priceMinor: '300000000',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${project.body.publicId}`)
      .set('Cookie', a.cookie)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${project.body.publicId}`)
      .set('Cookie', a.cookie)
      .expect(404);

    const surviving = await request(app.getHttpServer())
      .get(`/api/v1/properties/${property.body.publicId}`)
      .set('Cookie', a.cookie)
      .expect(200);
    expect(surviving.body.publicId).toBe(property.body.publicId);
    expect(surviving.body.projectPublicId).toBe(project.body.publicId);

    await request(app.getHttpServer())
      .get(`/api/v1/public/projects/${project.body.publicId}`)
      .expect(404);
  });
});
