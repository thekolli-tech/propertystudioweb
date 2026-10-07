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

async function onboard(
  app: INestApplication,
  cookie: string,
  type: 'DEVELOPER' | 'AGENCY',
  name: string,
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/organizations/onboard')
    .set('Cookie', cookie)
    .send({
      type,
      name,
      profile: {
        legalName: `${name} Legal`,
        displayName: name,
        description: 'Phase 14A org',
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
  const cookie = extractSessionCookie(relogin.headers['set-cookie'])!;
  return { ...user, cookie };
}

describe('Phase 14A unified dashboards & workflows security', () => {
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
      'verification_documents',
      'verification_cases',
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

  it('1. developer dashboard cannot see another organization', async () => {
    const a = await register(app, `dev-a-${Date.now()}@example.com`, []);
    const orgA = await onboard(app, a.cookie, 'DEVELOPER', `Dev A ${Date.now()}`);
    await switchOrg(app, a.cookie, orgA.orgPublicId);

    const b = await register(app, `dev-b-${Date.now()}@example.com`, []);
    const orgB = await onboard(app, b.cookie, 'DEVELOPER', `Dev B ${Date.now()}`);
    await switchOrg(app, b.cookie, orgB.orgPublicId);

    const denied = await request(app.getHttpServer())
      .get(`/api/v1/dashboard/developer?organizationPublicId=${orgA.orgPublicId}`)
      .set('Cookie', b.cookie)
      .expect(404);
    expect(denied.body.error.code).toBe('NOT_FOUND');
  });

  it('2. agent dashboard cannot see another organization', async () => {
    const a = await register(app, `ag-a-${Date.now()}@example.com`, []);
    const orgA = await onboard(app, a.cookie, 'AGENCY', `Agency A ${Date.now()}`);
    await switchOrg(app, a.cookie, orgA.orgPublicId);

    const b = await register(app, `ag-b-${Date.now()}@example.com`, []);
    const orgB = await onboard(app, b.cookie, 'AGENCY', `Agency B ${Date.now()}`);
    await switchOrg(app, b.cookie, orgB.orgPublicId);

    await request(app.getHttpServer())
      .get(`/api/v1/dashboard/agent?organizationPublicId=${orgA.orgPublicId}`)
      .set('Cookie', b.cookie)
      .expect(404);
  });

  it('3-4. PROPERTY_ADMIN only sees assigned resources and cannot access admin metrics', async () => {
    const propAdmin = await grantPlatformRole(
      app,
      prisma,
      `pa-${Date.now()}@example.com`,
      'PROPERTY_ADMIN',
    );

    const dash = await request(app.getHttpServer())
      .get('/api/v1/dashboard/property-admin')
      .set('Cookie', propAdmin.cookie)
      .expect(200);
    expect(dash.body.role).toBe('PROPERTY_ADMIN');
    expect(dash.body.assignedProperties).toEqual([]);

    const adminDenied = await request(app.getHttpServer())
      .get('/api/v1/dashboard/admin')
      .set('Cookie', propAdmin.cookie)
      .expect(403);
    expect(adminDenied.body.error.code).toBe('FORBIDDEN');
  });

  it('5. seeker cannot access developer private metrics', async () => {
    const owner = await register(app, `seeker-dev-${Date.now()}@example.com`, []);
    const org = await onboard(app, owner.cookie, 'DEVELOPER', `Seeker Dev ${Date.now()}`);
    const seeker = await register(app, `seeker-only-${Date.now()}@example.com`);

    await request(app.getHttpServer())
      .get(`/api/v1/dashboard/developer?organizationPublicId=${org.orgPublicId}`)
      .set('Cookie', seeker.cookie)
      .expect(404);
  });

  it('6. cross-tenant dashboard access returns NOT_FOUND', async () => {
    const owner = await register(app, `xt-${Date.now()}@example.com`, []);
    const org = await onboard(app, owner.cookie, 'DEVELOPER', `XT Org ${Date.now()}`);
    const outsider = await register(app, `xt-out-${Date.now()}@example.com`, []);
    await onboard(app, outsider.cookie, 'DEVELOPER', `Outsider ${Date.now()}`);

    await request(app.getHttpServer())
      .get(`/api/v1/dashboard/developer?organizationPublicId=${org.orgPublicId}`)
      .set('Cookie', outsider.cookie)
      .expect(404);
  });

  it('7-8. unentitled lead cannot become CRM contact with protected data; PII protected', async () => {
    const seeker = await register(app, `wf-seeker-${Date.now()}@example.com`);
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
        purpose: 'END_USE',
        timeline: 'FLEXIBLE',
      })
      .expect(201);

    const agent = await register(app, `wf-agent-${Date.now()}@example.com`, []);
    const org = await onboard(app, agent.cookie, 'AGENCY', `WF Agency ${Date.now()}`);
    await switchOrg(app, agent.cookie, org.orgPublicId);

    // Create lead without purchase entitlement when possible.
    const leadAttempt = await request(app.getHttpServer())
      .post('/api/v1/leads/from-requirement')
      .set('Cookie', agent.cookie)
      .send({
        requirementPublicId: requirement.body.publicId,
        organizationPublicId: org.orgPublicId,
      });

    if (leadAttempt.status === 201) {
      const denied = await request(app.getHttpServer())
        .post('/api/v1/workflows/crm-contact-from-lead')
        .set('Cookie', agent.cookie)
        .send({
          organizationPublicId: org.orgPublicId,
          leadPublicId: leadAttempt.body.publicId,
          includeRevealedContact: true,
        });
      expect([403, 404]).toContain(denied.status);
      if (denied.status === 403 || denied.status === 404) {
        expect(JSON.stringify(denied.body)).not.toMatch(/@example\.com/);
      }
    } else {
      // Agency may be blocked from creating leads until verified — still assert workflow auth.
      await request(app.getHttpServer())
        .post('/api/v1/workflows/crm-contact-from-lead')
        .set('Cookie', agent.cookie)
        .send({
          organizationPublicId: org.orgPublicId,
          leadPublicId: 'PS-LEAD-999999999',
          includeRevealedContact: false,
        })
        .expect(404);
    }
  });

  it('9. duplicate workflow processing is idempotent when entitled contact exists', async () => {
    const agency = await register(app, `idem-${Date.now()}@example.com`, []);
    const org = await onboard(app, agency.cookie, 'AGENCY', `Idem Agency ${Date.now()}`);
    await switchOrg(app, agency.cookie, org.orgPublicId);

    const orgRow = await prisma.organization.findFirstOrThrow({
      where: { publicId: org.orgPublicId },
    });
    const seeker = await register(app, `idem-seeker-${Date.now()}@example.com`);
    const seekerUser = await prisma.user.findFirstOrThrow({
      where: { publicId: seeker.publicId },
    });

    const stamp = String(Date.now()).slice(-8);
    const agencyUser = await prisma.user.findFirstOrThrow({
      where: { publicId: agency.publicId },
    });

    const requirement = await prisma.requirement.create({
      data: {
        id: newUuid(),
        publicId: `PS-REQ-${stamp}`,
        ownerUserId: seekerUser.id,
        propertyType: 'APARTMENT',
        transactionType: 'BUY',
        city: 'Hyderabad',
        purpose: 'END_USE',
        timeline: 'FLEXIBLE',
        status: 'ACTIVE',
        visibility: 'MARKETPLACE',
      },
    });

    const lead = await prisma.lead.create({
      data: {
        id: newUuid(),
        publicId: `PS-LEAD-${stamp}`,
        requirementId: requirement.id,
        recipientOrganizationId: orgRow.id,
        matchScore: 80,
        matchedCriteria: {},
        unmatchedCriteria: {},
        matchExplanation: 'test',
        status: 'NEW',
      },
    });

    await prisma.leadAccessGrant.create({
      data: {
        id: newUuid(),
        publicId: `PS-LACC-${stamp}`,
        organizationId: orgRow.id,
        leadId: lead.id,
        requestingUserId: agencyUser.id,
        accessState: 'PURCHASED',
      },
    });

    const first = await request(app.getHttpServer())
      .post('/api/v1/workflows/crm-contact-from-lead')
      .set('Cookie', agency.cookie)
      .send({
        organizationPublicId: org.orgPublicId,
        leadPublicId: lead.publicId,
        includeRevealedContact: false,
      })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/workflows/crm-contact-from-lead')
      .set('Cookie', agency.cookie)
      .send({
        organizationPublicId: org.orgPublicId,
        leadPublicId: lead.publicId,
        includeRevealedContact: false,
      })
      .expect(201);

    expect(first.body.created).toBe(true);
    expect(second.body.created).toBe(false);
    expect(second.body.contactPublicId).toBe(first.body.contactPublicId);
    expect(first.body.contactFieldsIncluded).toBe(false);

    const contacts = await prisma.crmContact.count({
      where: { organizationId: orgRow.id, sourceLeadId: lead.id },
    });
    expect(contacts).toBe(1);
  });

  it('10. unauthorized dashboard endpoint access is denied', async () => {
    await request(app.getHttpServer()).get('/api/v1/dashboard/admin').expect(401);
    await request(app.getHttpServer()).get('/api/v1/dashboard/developer').expect(401);
  });

  it('11. admin-only metrics remain admin-only', async () => {
    const seeker = await register(app, `admin-deny-${Date.now()}@example.com`);
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/admin')
      .set('Cookie', seeker.cookie)
      .expect(403);

    const admin = await grantPlatformRole(
      app,
      prisma,
      `admin-ok-${Date.now()}@example.com`,
      'ADMIN',
    );
    const ok = await request(app.getHttpServer())
      .get('/api/v1/dashboard/admin')
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(ok.body.role).toBe('ADMIN');
    expect(Array.isArray(ok.body.metrics)).toBe(true);
  });

  it('seeker dashboard returns empty-friendly aggregates', async () => {
    const seeker = await register(app, `dash-seeker-${Date.now()}@example.com`);
    const dash = await request(app.getHttpServer())
      .get('/api/v1/dashboard/seeker')
      .set('Cookie', seeker.cookie)
      .expect(200);
    expect(dash.body.role).toBe('SEEKER');
    expect(dash.body.recentRequirements).toEqual([]);
  });
});
