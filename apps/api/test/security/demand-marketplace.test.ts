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
): Promise<{ cookie: string; publicId: string }> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email,
      password: 'CorrectHorseBattery!',
      personas,
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
        operatingZones: ['Hyderabad', 'Tellapur'],
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
        description: 'Test agency',
        operatingZones: ['Hyderabad'],
        headquartersCity: 'Hyderabad',
        specialization: 'Residential',
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

describe('Phase 7 demand marketplace security', () => {
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
    await prisma.$executeRawUnsafe('DELETE FROM valuation_estimates');
    await prisma.$executeRawUnsafe('DELETE FROM floor_plan_analyses');
    await prisma.$executeRawUnsafe('DELETE FROM document_analyses');
    await prisma.$executeRawUnsafe('DELETE FROM ai_jobs');
    await prisma.$executeRawUnsafe('DELETE FROM intelligence_observations');
    await prisma.$executeRawUnsafe('DELETE FROM infrastructure_assets');
    await prisma.$executeRawUnsafe('DELETE FROM market_snapshots');
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

    for (const table of [
      'media_analytics_events',
      'external_media_mappings',
      'media_collection_items',
      'media_collections',
      'editorial_content_revisions',
      'editorial_contents',
      'creator_profiles',
      'broadcast_studio_configs',
    ] as const) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }

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
    if (app) {
      await app.close();
    }
  });

  async function createPublishedRequirement(cookie: string) {
    const created = await request(app.getHttpServer())
      .post('/api/v1/requirements')
      .set('Cookie', cookie)
      .send({
        propertyType: 'VILLA',
        transactionType: 'BUY',
        configuration: 'FOUR_BHK',
        bedrooms: 4,
        budgetMinMinor: '60000000000',
        budgetMaxMinor: '80000000000',
        city: 'Hyderabad',
        locality: 'Tellapur',
        microMarket: 'Tellapur',
        purpose: 'INVESTMENT',
        timeline: 'WITHIN_3_MONTHS',
        vaastuRequired: true,
        amenities: ['Gated Community'],
        notes: 'Call me at 9999999999 secretly',
      })
      .expect(201);

    expect(created.body.publicId).toMatch(/^PS-REQ-\d+$/);
    expect(created.body.notes).toContain('9999999999');

    const published = await request(app.getHttpServer())
      .post(`/api/v1/requirements/${created.body.publicId}/publish`)
      .set('Cookie', cookie)
      .expect(201);

    expect(published.body.status).toBe('ACTIVE');
    expect(published.body.visibility).toBe('MARKETPLACE');
    return published.body.publicId as string;
  }

  it('1-2. prevents user A from reading or modifying user B private requirements', async () => {
    const a = await register(app, 'seeker-a@example.com');
    const b = await register(app, 'seeker-b@example.com');

    const created = await request(app.getHttpServer())
      .post('/api/v1/requirements')
      .set('Cookie', a.cookie)
      .send({
        propertyType: 'APARTMENT',
        transactionType: 'BUY',
        city: 'Bengaluru',
        notes: 'private note for A only',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/requirements/${created.body.publicId}`)
      .set('Cookie', b.cookie)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/requirements/${created.body.publicId}`)
      .set('Cookie', b.cookie)
      .send({ city: 'Hijacked' })
      .expect(404);
  });

  it('3-4. PRIVATE requirements never appear publicly and marketplace hides PII', async () => {
    const seeker = await register(app, 'seeker-private@example.com');
    const privateReq = await request(app.getHttpServer())
      .post('/api/v1/requirements')
      .set('Cookie', seeker.cookie)
      .send({
        propertyType: 'VILLA',
        transactionType: 'BUY',
        city: 'Hyderabad',
        locality: 'Tellapur',
        notes: 'secret phone 8888888888',
        visibility: 'PRIVATE',
      })
      .expect(201);

    const publicListBefore = await request(app.getHttpServer())
      .get('/api/v1/public/requirements')
      .expect(200);
    expect(
      publicListBefore.body.requirements.find(
        (item: { publicId: string }) => item.publicId === privateReq.body.publicId,
      ),
    ).toBeUndefined();

    const marketplaceId = await createPublishedRequirement(seeker.cookie);
    const publicList = await request(app.getHttpServer())
      .get('/api/v1/public/requirements')
      .expect(200);
    const item = publicList.body.requirements.find(
      (row: { publicId: string }) => row.publicId === marketplaceId,
    );
    expect(item).toBeTruthy();
    expect(item.notes).toBeUndefined();
    expect(item.ownerUserPublicId).toBeUndefined();
    expect(item.email).toBeUndefined();
    expect(item.phone).toBeUndefined();
    expect(JSON.stringify(item)).not.toMatch(/9999999999|8888888888|seeker-private@example\.com/);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/public/requirements/${marketplaceId}`)
      .expect(200);
    expect(detail.body.notes).toBeUndefined();
    expect(detail.body.ownerUserPublicId).toBeUndefined();
    expect(JSON.stringify(detail.body)).not.toMatch(/9999999999/);
  });

  it('5. unverified agency cannot create marketplace leads', async () => {
    const seeker = await register(app, 'seeker-agency@example.com');
    const reqId = await createPublishedRequirement(seeker.cookie);

    const agent = await register(app, 'agent-unverified@example.com', []);
    const orgId = await onboardAgency(app, agent.cookie, 'Unverified Agency');
    await switchOrg(app, agent.cookie, orgId);

    await request(app.getHttpServer())
      .post('/api/v1/leads/from-requirement')
      .set('Cookie', agent.cookie)
      .send({
        requirementPublicId: reqId,
        organizationPublicId: orgId,
      })
      .expect(403);
  });

  it('6-7. org can only see its own leads; cross-org returns not found', async () => {
    const seeker = await register(app, 'seeker-leads@example.com');
    const reqId = await createPublishedRequirement(seeker.cookie);

    const devA = await register(app, 'dev-a-leads@example.com', []);
    const orgA = await onboardDeveloper(app, devA.cookie, 'Dev A Leads');
    await switchOrg(app, devA.cookie, orgA);

    const lead = await request(app.getHttpServer())
      .post('/api/v1/leads/from-requirement')
      .set('Cookie', devA.cookie)
      .send({
        requirementPublicId: reqId,
        organizationPublicId: orgA,
      })
      .expect(201);
    expect(lead.body.publicId).toMatch(/^PS-LEAD-\d+$/);
    expect(lead.body.requirement.notes).toBeUndefined();
    expect(JSON.stringify(lead.body)).not.toMatch(/9999999999/);

    const listA = await request(app.getHttpServer())
      .get(`/api/v1/leads?organizationPublicId=${orgA}`)
      .set('Cookie', devA.cookie)
      .expect(200);
    expect(listA.body.leads).toHaveLength(1);

    const devB = await register(app, 'dev-b-leads@example.com', []);
    const orgB = await onboardDeveloper(app, devB.cookie, 'Dev B Leads');
    await switchOrg(app, devB.cookie, orgB);

    await request(app.getHttpServer())
      .get(`/api/v1/leads/${lead.body.publicId}`)
      .set('Cookie', devB.cookie)
      .expect(404);

    const listB = await request(app.getHttpServer())
      .get(`/api/v1/leads?organizationPublicId=${orgB}`)
      .set('Cookie', devB.cookie)
      .expect(200);
    expect(listB.body.leads).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/api/v1/leads?organizationPublicId=${orgA}`)
      .set('Cookie', devB.cookie)
      .expect(404);
  });

  it('8. PROPERTY_ADMIN cannot access marketplace admin or org leads', async () => {
    const adminUser = await register(app, 'prop-admin-mkt@example.com', []);
    await prisma.userPlatformRole.create({
      data: {
        id: newUuid(),
        userId: (await prisma.user.findFirstOrThrow({ where: { publicId: adminUser.publicId } }))
          .id,
        role: 'PROPERTY_ADMIN',
      },
    });

    // Re-login to rebuild actor permissions with platform role.
    await request(app.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', adminUser.cookie);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'prop-admin-mkt@example.com', password: 'CorrectHorseBattery!' })
      .expect(201);
    const cookie = extractSessionCookie(login.headers['set-cookie'])!;

    await request(app.getHttpServer())
      .get('/api/v1/admin/requirements')
      .set('Cookie', cookie)
      .expect(403);

    await request(app.getHttpServer()).get('/api/v1/admin/leads').set('Cookie', cookie).expect(403);
  });

  it('9. platform admin can list requirements and leads', async () => {
    const seeker = await register(app, 'seeker-admin@example.com');
    const reqId = await createPublishedRequirement(seeker.cookie);

    const superAdmin = await register(app, 'super-admin-mkt@example.com', []);
    await prisma.userPlatformRole.create({
      data: {
        id: newUuid(),
        userId: (await prisma.user.findFirstOrThrow({ where: { publicId: superAdmin.publicId } }))
          .id,
        role: 'SUPER_ADMIN',
      },
    });
    await request(app.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', superAdmin.cookie);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'super-admin-mkt@example.com', password: 'CorrectHorseBattery!' })
      .expect(201);
    const cookie = extractSessionCookie(login.headers['set-cookie'])!;

    const requirements = await request(app.getHttpServer())
      .get('/api/v1/admin/requirements')
      .set('Cookie', cookie)
      .expect(200);
    expect(
      requirements.body.requirements.some((row: { publicId: string }) => row.publicId === reqId),
    ).toBe(true);
    expect(requirements.body.requirements[0].ownerUserPublicId).toMatch(/^PS-USER-\d+$/);

    const leads = await request(app.getHttpServer())
      .get('/api/v1/admin/leads')
      .set('Cookie', cookie)
      .expect(200);
    expect(Array.isArray(leads.body.leads)).toBe(true);
  });

  it('10. duplicate lead creation is prevented and idempotent', async () => {
    const seeker = await register(app, 'seeker-dup@example.com');
    const reqId = await createPublishedRequirement(seeker.cookie);

    const dev = await register(app, 'dev-dup@example.com', []);
    const orgId = await onboardDeveloper(app, dev.cookie, 'Dev Dup Org');
    await switchOrg(app, dev.cookie, orgId);

    const first = await request(app.getHttpServer())
      .post('/api/v1/leads/from-requirement')
      .set('Cookie', dev.cookie)
      .send({ requirementPublicId: reqId, organizationPublicId: orgId })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/leads/from-requirement')
      .set('Cookie', dev.cookie)
      .send({ requirementPublicId: reqId, organizationPublicId: orgId })
      .expect(201);

    expect(second.body.publicId).toBe(first.body.publicId);

    const count = await prisma.lead.count({
      where: {
        requirement: { publicId: reqId },
        recipientOrganization: { publicId: orgId },
      },
    });
    expect(count).toBe(1);
  });

  it('11. out-of-scope requirement returns not-found', async () => {
    const seeker = await register(app, 'seeker-missing@example.com');
    await request(app.getHttpServer())
      .get('/api/v1/requirements/PS-REQ-999999')
      .set('Cookie', seeker.cookie)
      .expect(404);
  });

  it('12. requirement status transitions are enforced server-side', async () => {
    const seeker = await register(app, 'seeker-status@example.com');
    const created = await request(app.getHttpServer())
      .post('/api/v1/requirements')
      .set('Cookie', seeker.cookie)
      .send({
        propertyType: 'APARTMENT',
        transactionType: 'RENT',
        city: 'Chennai',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/requirements/${created.body.publicId}/pause`)
      .set('Cookie', seeker.cookie)
      .expect(409);

    await request(app.getHttpServer())
      .post(`/api/v1/requirements/${created.body.publicId}/publish`)
      .set('Cookie', seeker.cookie)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/requirements/${created.body.publicId}/pause`)
      .set('Cookie', seeker.cookie)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/requirements/${created.body.publicId}/close`)
      .set('Cookie', seeker.cookie)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/requirements/${created.body.publicId}/publish`)
      .set('Cookie', seeker.cookie)
      .expect(409);

    const publicList = await request(app.getHttpServer())
      .get('/api/v1/public/requirements')
      .expect(200);
    expect(
      publicList.body.requirements.find(
        (row: { publicId: string }) => row.publicId === created.body.publicId,
      ),
    ).toBeUndefined();
  });

  it('verified agency can create a lead after verification', async () => {
    const seeker = await register(app, 'seeker-verified-agent@example.com');
    const reqId = await createPublishedRequirement(seeker.cookie);

    const agent = await register(app, 'agent-verified@example.com', []);
    const orgId = await onboardAgency(app, agent.cookie, 'Verified Agency');
    await prisma.agencyProfile.update({
      where: {
        organizationId: (await prisma.organization.findFirstOrThrow({ where: { publicId: orgId } }))
          .id,
      },
      data: { verificationStatus: 'VERIFIED' },
    });
    await switchOrg(app, agent.cookie, orgId);

    const lead = await request(app.getHttpServer())
      .post('/api/v1/leads/from-requirement')
      .set('Cookie', agent.cookie)
      .send({ requirementPublicId: reqId, organizationPublicId: orgId })
      .expect(201);
    expect(lead.body.matchScore).toBeGreaterThan(0);
    expect(lead.body.status).toBe('ASSIGNED');
  });
});
