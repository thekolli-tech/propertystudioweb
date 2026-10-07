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
        description: 'Phase 15A developer',
        operatingZones: ['Hyderabad'],
        headquartersCity: 'Hyderabad',
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

async function grantPlatformRole(
  app: INestApplication,
  prisma: PrismaService,
  email: string,
  role: 'ADMIN' | 'PROPERTY_ADMIN',
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
  return { ...user, cookie: extractSessionCookie(relogin.headers['set-cookie'])! };
}

async function createPublishedProject(
  app: INestApplication,
  cookie: string,
  orgPublicId: string,
  name: string,
) {
  const project = await request(app.getHttpServer())
    .post('/api/v1/projects')
    .set('Cookie', cookie)
    .send({
      organizationPublicId: orgPublicId,
      name,
      projectType: 'RESIDENTIAL',
      city: 'Hyderabad',
    })
    .expect(201);
  await request(app.getHttpServer())
    .patch(`/api/v1/projects/${project.body.publicId}`)
    .set('Cookie', cookie)
    .send({ lifecycleStatus: 'PUBLISHED' })
    .expect(200);
  return project.body.publicId as string;
}

async function ensureProjectClaimEntitlement(
  prisma: PrismaService,
  orgPublicId: string,
) {
  let plan = await prisma.subscriptionPlan.findFirst({ where: { code: 'PHASE15A_CLAIM' } });
  if (!plan) {
    plan = await prisma.subscriptionPlan.create({
      data: {
        id: newUuid(),
        publicId: `PS-PLAN-${Date.now().toString().slice(-6)}`,
        name: 'Phase 15A Claim Plan',
        code: 'PHASE15A_CLAIM',
        billingInterval: 'MONTHLY',
        priceMinor: 0n,
        currency: 'INR',
        active: true,
        entitlements: {
          create: [{ id: newUuid(), key: 'PROJECT_CLAIM', enabled: true }],
        },
      },
    });
  }
  const org = await prisma.organization.findFirstOrThrow({ where: { publicId: orgPublicId } });
  const existing = await prisma.organizationSubscription.findFirst({
    where: { organizationId: org.id, status: { in: ['ACTIVE', 'TRIALING'] } },
  });
  if (!existing) {
    await prisma.organizationSubscription.create({
      data: {
        id: newUuid(),
        publicId: `PS-SUB-${Date.now().toString().slice(-6)}`,
        organizationId: org.id,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

const CLEANUP = [
  'construction_updates',
  'project_claims',
  'saved_search_matches',
  'saved_searches',
  'saved_properties',
  'ai_chat_analytics_events',
  'ai_conversation_messages',
  'ai_conversations',
  'crm_activities',
  'crm_follow_ups',
  'crm_site_visits',
  'crm_deals',
  'crm_contacts',
  'lead_purchases',
  'lead_access_grants',
  'leads',
  'requirements',
  'media_assets',
  'document_assets',
  'properties',
  'communities',
  'projects',
  'organization_subscriptions',
  'plan_entitlements',
  'subscription_plans',
  'developer_profiles',
  'agency_profiles',
  'organization_memberships',
  'organizations',
  'sessions',
  'refresh_tokens',
  'user_platform_roles',
  'user_personas',
  'user_credentials',
  'users',
] as const;

describe('Phase 15A developer project operations security', () => {
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
    for (const table of CLEANUP) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('1. developer can manage authorized project workspace', async () => {
    const owner = await register(app, `dev-a-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Ops Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org);
    const projectPublicId = await createPublishedProject(
      app,
      owner.cookie,
      org,
      `Skyline ${Date.now()}`,
    );

    const workspace = await request(app.getHttpServer())
      .get(`/api/v1/org/${org}/projects/${projectPublicId}/workspace`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(workspace.body.project.publicId).toBe(projectPublicId);
    expect(workspace.body.inventoryByAvailability).toBeTruthy();
  });

  it('2. developer cannot manage another organization project', async () => {
    const a = await register(app, `dev-x-${Date.now()}@example.com`, []);
    const b = await register(app, `dev-y-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, a.cookie, `OrgX ${Date.now()}`);
    const orgB = await onboardDeveloper(app, b.cookie, `OrgY ${Date.now()}`);
    await switchOrg(app, a.cookie, orgA);
    await switchOrg(app, b.cookie, orgB);
    const projectA = await createPublishedProject(app, a.cookie, orgA, `Private ${Date.now()}`);

    await request(app.getHttpServer())
      .get(`/api/v1/org/${orgA}/projects/${projectA}/workspace`)
      .set('Cookie', b.cookie)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectA}/construction-updates`)
      .set('Cookie', b.cookie)
      .send({
        title: 'Hijack update',
        milestone: 'FOUNDATION',
        updateDate: '2026-10-01',
      })
      .expect(404);
  });

  it('3-5. staff permissions; property admin scoped; agent denied', async () => {
    const owner = await register(app, `owner-staff-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Staff Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org);
    const projectPublicId = await createPublishedProject(
      app,
      owner.cookie,
      org,
      `Staff Project ${Date.now()}`,
    );

    const padmin = await grantPlatformRole(
      app,
      prisma,
      `padmin-15a-${Date.now()}@example.com`,
      'PROPERTY_ADMIN',
    );
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectPublicId}/construction-updates`)
      .set('Cookie', padmin.cookie)
      .send({
        title: 'Should fail',
        milestone: 'FOUNDATION',
        updateDate: '2026-10-01',
      })
      .expect(403);

    const agent = await register(app, `agent-15a-${Date.now()}@example.com`, []);
    await request(app.getHttpServer())
      .post('/api/v1/organizations/onboard')
      .set('Cookie', agent.cookie)
      .send({
        type: 'AGENCY',
        name: `Agency ${Date.now()}`,
        profile: {
          legalName: 'Agency Legal',
          displayName: 'Agency',
          description: 'Agency',
          operatingZones: ['Hyderabad'],
          headquartersCity: 'Hyderabad',
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectPublicId}`)
      .set('Cookie', agent.cookie)
      .send({ name: 'Hijacked' })
      .expect(404);
  });

  it('6. public users cannot mutate project', async () => {
    const owner = await register(app, `pub-own-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Pub Org ${Date.now()}`);
    const projectPublicId = await createPublishedProject(
      app,
      owner.cookie,
      org,
      `Public Mut ${Date.now()}`,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectPublicId}`)
      .send({ name: 'Anonymous' })
      .expect(401);
  });

  it('7-8. unpublished construction updates stay private; published are public', async () => {
    const owner = await register(app, `cupd-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `CUPD Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org);
    const projectPublicId = await createPublishedProject(
      app,
      owner.cookie,
      org,
      `CUPD Project ${Date.now()}`,
    );

    const draft = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectPublicId}/construction-updates`)
      .set('Cookie', owner.cookie)
      .send({
        title: 'Foundation draft',
        milestone: 'FOUNDATION',
        percentComplete: 20,
        updateDate: '2026-09-15',
        description: 'Internal only',
      })
      .expect(201);
    expect(draft.body.publicationStatus).toBe('DRAFT');
    expect(draft.body.storageKey).toBeUndefined();

    const publicList = await request(app.getHttpServer())
      .get(`/api/v1/public/projects/${projectPublicId}/construction-updates`)
      .expect(200);
    expect(publicList.body.updates).toHaveLength(0);

    await request(app.getHttpServer())
      .post(`/api/v1/construction-updates/${draft.body.publicId}/publish`)
      .set('Cookie', owner.cookie)
      .expect(201);

    const published = await request(app.getHttpServer())
      .get(`/api/v1/public/projects/${projectPublicId}/construction-updates`)
      .expect(200);
    expect(published.body.updates).toHaveLength(1);
    expect(published.body.updates[0].title).toBe('Foundation draft');
    expect(JSON.stringify(published.body)).not.toMatch(/storageKey|password|secret/i);
  });

  it('9-10. inventory availability change authorized; cross-tenant denied', async () => {
    const a = await register(app, `inv-a-${Date.now()}@example.com`, []);
    const b = await register(app, `inv-b-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, a.cookie, `InvA ${Date.now()}`);
    await onboardDeveloper(app, b.cookie, `InvB ${Date.now()}`);
    await switchOrg(app, a.cookie, orgA);
    const projectPublicId = await createPublishedProject(app, a.cookie, orgA, `Inv ${Date.now()}`);

    const property = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        projectPublicId,
        title: 'Unit 101',
        propertyType: 'APARTMENT',
        priceMinor: '500000000',
        city: 'Hyderabad',
      })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/properties/${property.body.publicId}`)
      .set('Cookie', a.cookie)
      .send({ availabilityStatus: 'SOLD' })
      .expect(200);
    expect(updated.body.availabilityStatus).toBe('SOLD');

    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${property.body.publicId}`)
      .set('Cookie', b.cookie)
      .send({ availabilityStatus: 'AVAILABLE' })
      .expect(404);

    const inventory = await request(app.getHttpServer())
      .get(`/api/v1/org/${orgA}/projects/${projectPublicId}/inventory`)
      .set('Cookie', a.cookie)
      .expect(200);
    expect(inventory.body.properties.some((p: { publicId: string }) => p.publicId === property.body.publicId)).toBe(
      true,
    );
  });

  it('11. raw storage keys never appear in project-ops DTOs', async () => {
    const owner = await register(app, `keys-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Keys Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org);
    const projectPublicId = await createPublishedProject(app, owner.cookie, org, `Keys ${Date.now()}`);
    const workspace = await request(app.getHttpServer())
      .get(`/api/v1/org/${org}/projects/${projectPublicId}/workspace`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(JSON.stringify(workspace.body)).not.toMatch(/storageKey|S3_SECRET|password/i);
  });

  it('12-13. claim does not grant access before approval; approve transfers with entitlement', async () => {
    const owner = await register(app, `claim-own-${Date.now()}@example.com`, []);
    const claimer = await register(app, `claim-er-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, owner.cookie, `Owner Org ${Date.now()}`);
    const orgB = await onboardDeveloper(app, claimer.cookie, `Claimer Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, orgA);
    await switchOrg(app, claimer.cookie, orgB);
    const projectPublicId = await createPublishedProject(
      app,
      owner.cookie,
      orgA,
      `Claimable ${Date.now()}`,
    );

    const claim = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectPublicId}/claims`)
      .set('Cookie', claimer.cookie)
      .send({
        organizationPublicId: orgB,
        justification: 'We have authorization letters for this project group.',
        submit: true,
      })
      .expect(201);
    expect(claim.body.status).toBe('SUBMITTED');

    // Before approval, claimer still cannot manage the project.
    await request(app.getHttpServer())
      .get(`/api/v1/org/${orgA}/projects/${projectPublicId}/workspace`)
      .set('Cookie', claimer.cookie)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectPublicId}/construction-updates`)
      .set('Cookie', claimer.cookie)
      .send({
        title: 'Premature',
        milestone: 'FOUNDATION',
        updateDate: '2026-10-01',
      })
      .expect(404);

    const admin = await grantPlatformRole(app, prisma, `admin-claim-${Date.now()}@example.com`, 'ADMIN');

    // Approval without entitlement fails.
    await request(app.getHttpServer())
      .post(`/api/v1/admin/project-claims/${claim.body.publicId}/approve`)
      .set('Cookie', admin.cookie)
      .send({ reviewNotes: 'Looks good' })
      .expect(403);

    await ensureProjectClaimEntitlement(prisma, orgB);

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/admin/project-claims/${claim.body.publicId}/approve`)
      .set('Cookie', admin.cookie)
      .send({ reviewNotes: 'Documents verified' })
      .expect(201);
    expect(approved.body.status).toBe('APPROVED');

    // After approval, claimer owns the project.
    await request(app.getHttpServer())
      .get(`/api/v1/org/${orgB}/projects/${projectPublicId}/workspace`)
      .set('Cookie', claimer.cookie)
      .expect(200);

    // Prior owner loses access.
    await request(app.getHttpServer())
      .get(`/api/v1/org/${orgA}/projects/${projectPublicId}/workspace`)
      .set('Cookie', owner.cookie)
      .expect(404);
  });

  it('14. unauthorized lead contact information remains hidden on workspace', async () => {
    const owner = await register(app, `lead-hide-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Lead Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org);
    const projectPublicId = await createPublishedProject(
      app,
      owner.cookie,
      org,
      `Lead Project ${Date.now()}`,
    );
    const workspace = await request(app.getHttpServer())
      .get(`/api/v1/org/${org}/projects/${projectPublicId}/workspace`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(typeof workspace.body.leadCount).toBe('number');
    expect(JSON.stringify(workspace.body)).not.toMatch(/@.*\.com|\+91-|phone|email/i);
  });

  it('15. important mutations generate audit events', async () => {
    const owner = await register(app, `audit-15a-${Date.now()}@example.com`, []);
    const org = await onboardDeveloper(app, owner.cookie, `Audit Org ${Date.now()}`);
    await switchOrg(app, owner.cookie, org);
    const projectPublicId = await createPublishedProject(
      app,
      owner.cookie,
      org,
      `Audit Project ${Date.now()}`,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectPublicId}/construction-updates`)
      .set('Cookie', owner.cookie)
      .send({
        title: 'Audited update',
        milestone: 'STRUCTURE',
        updateDate: '2026-10-02',
      })
      .expect(201);

    const events = await prisma.auditEvent.findMany({
      where: { action: { in: ['construction.update.created', 'project.published', 'project.created'] } },
    });
    expect(events.length).toBeGreaterThan(0);
  });
});
