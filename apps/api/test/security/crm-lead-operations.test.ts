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
        description: 'CRM test developer',
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

describe('Phase 8 CRM lead operations security', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '1000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '1000';

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

  async function createMarketplaceLead() {
    const seeker = await register(app, `seeker-${Date.now()}@example.com`);
    const created = await request(app.getHttpServer())
      .post('/api/v1/requirements')
      .set('Cookie', seeker.cookie)
      .send({
        propertyType: 'VILLA',
        transactionType: 'BUY',
        city: 'Hyderabad',
        locality: 'Tellapur',
        notes: 'private buyer note 7777777777',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/requirements/${created.body.publicId}/publish`)
      .set('Cookie', seeker.cookie)
      .expect(201);

    const dev = await register(app, `dev-${Date.now()}@example.com`, []);
    const orgId = await onboardDeveloper(app, dev.cookie, `Dev CRM ${Date.now()}`);
    await switchOrg(app, dev.cookie, orgId);
    const lead = await request(app.getHttpServer())
      .post('/api/v1/leads/from-requirement')
      .set('Cookie', dev.cookie)
      .send({ requirementPublicId: created.body.publicId, organizationPublicId: orgId })
      .expect(201);
    return { seeker, dev, orgId, leadPublicId: lead.body.publicId as string };
  }

  it('1-2. organization A cannot read or modify organization B CRM data', async () => {
    const a = await createMarketplaceLead();
    const contact = await request(app.getHttpServer())
      .post('/api/v1/crm/contacts')
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        sourceLeadPublicId: a.leadPublicId,
        displayName: 'Buyer A',
        phone: '+91-9000000001',
        email: 'buyer-a@example.com',
      })
      .expect(201);
    expect(contact.body.publicId).toMatch(/^PS-CONTACT-\d+$/);

    const bDev = await register(app, `dev-b-${Date.now()}@example.com`, []);
    const orgB = await onboardDeveloper(app, bDev.cookie, `Dev B ${Date.now()}`);
    await switchOrg(app, bDev.cookie, orgB);

    await request(app.getHttpServer())
      .get(`/api/v1/crm/contacts/${contact.body.publicId}`)
      .set('Cookie', bDev.cookie)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/crm/contacts/${contact.body.publicId}`)
      .set('Cookie', bDev.cookie)
      .send({ displayName: 'Hijacked' })
      .expect(404);

    const listB = await request(app.getHttpServer())
      .get(`/api/v1/crm/contacts?organizationPublicId=${a.orgId}`)
      .set('Cookie', bDev.cookie)
      .expect(404);
    expect(listB.body.error.code).toBe('NOT_FOUND');
  });

  it('3. cross-organization lead assignment fails', async () => {
    const a = await createMarketplaceLead();
    const outsider = await register(app, `outsider-${Date.now()}@example.com`, []);
    await request(app.getHttpServer())
      .post(`/api/v1/crm/leads/${a.leadPublicId}/assign`)
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        assigneeUserPublicId: outsider.publicId,
      })
      .expect(422);
  });

  it('4. invalid lead status transitions fail', async () => {
    const a = await createMarketplaceLead();
    await request(app.getHttpServer())
      .patch(`/api/v1/crm/leads/${a.leadPublicId}/status`)
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        status: 'BOOKED',
      })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/api/v1/crm/leads/${a.leadPublicId}/status`)
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        status: 'CONTACTED',
      })
      .expect(200);
  });

  it('5. unauthorized staff mutation fails for PROPERTY_ADMIN', async () => {
    const email = `prop-admin-${Date.now()}@example.com`;
    const admin = await register(app, email, []);
    await prisma.userPlatformRole.create({
      data: {
        id: newUuid(),
        userId: (await prisma.user.findFirstOrThrow({ where: { publicId: admin.publicId } })).id,
        role: 'PROPERTY_ADMIN',
      },
    });
    await request(app.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', admin.cookie);
    const relogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'CorrectHorseBattery!' })
      .expect(201);
    const cookie = extractSessionCookie(relogin.headers['set-cookie'])!;

    const a = await createMarketplaceLead();
    await request(app.getHttpServer())
      .get(`/api/v1/crm/overview?organizationPublicId=${a.orgId}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('6-7. public routes never expose CRM contacts or contact PII', async () => {
    const a = await createMarketplaceLead();
    await request(app.getHttpServer())
      .post('/api/v1/crm/contacts')
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        sourceLeadPublicId: a.leadPublicId,
        displayName: 'Secret Buyer',
        phone: '+91-9111111111',
        email: 'secret-buyer@example.com',
      })
      .expect(201);

    await request(app.getHttpServer()).get('/api/v1/crm/contacts').expect(401);

    const publicReqs = await request(app.getHttpServer())
      .get('/api/v1/public/requirements')
      .expect(200);
    expect(JSON.stringify(publicReqs.body)).not.toMatch(
      /9111111111|secret-buyer@example\.com|Secret Buyer/,
    );
  });

  it('8-10. follow-up, site visit, and deal organization isolation', async () => {
    const a = await createMarketplaceLead();
    const followUp = await request(app.getHttpServer())
      .post('/api/v1/crm/follow-ups')
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        leadPublicId: a.leadPublicId,
        title: 'Call back',
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        priority: 'HIGH',
      })
      .expect(201);
    expect(followUp.body.publicId).toMatch(/^PS-TASK-\d+$/);

    const visit = await request(app.getHttpServer())
      .post('/api/v1/crm/site-visits')
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        leadPublicId: a.leadPublicId,
        scheduledAt: new Date(Date.now() + 172800000).toISOString(),
      })
      .expect(201);
    expect(visit.body.publicId).toMatch(/^PS-VISIT-\d+$/);

    const deal = await request(app.getHttpServer())
      .post('/api/v1/crm/deals')
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        leadPublicId: a.leadPublicId,
        expectedValueMinor: '5000000000',
        status: 'OPEN',
      })
      .expect(201);
    expect(deal.body.publicId).toMatch(/^PS-DEAL-\d+$/);

    const bDev = await register(app, `iso-b-${Date.now()}@example.com`, []);
    const orgB = await onboardDeveloper(app, bDev.cookie, `Iso B ${Date.now()}`);
    await switchOrg(app, bDev.cookie, orgB);

    await request(app.getHttpServer())
      .patch(`/api/v1/crm/follow-ups/${followUp.body.publicId}`)
      .set('Cookie', bDev.cookie)
      .send({ status: 'COMPLETED' })
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/v1/crm/site-visits/${visit.body.publicId}`)
      .set('Cookie', bDev.cookie)
      .send({ status: 'CANCELLED' })
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/crm/deals/${deal.body.publicId}`)
      .set('Cookie', bDev.cookie)
      .expect(404);
  });

  it('11. audit events are generated for CRM mutations', async () => {
    const a = await createMarketplaceLead();
    await request(app.getHttpServer())
      .post('/api/v1/crm/contacts')
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        displayName: 'Audited Contact',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/crm/leads/${a.leadPublicId}/status`)
      .set('Cookie', a.dev.cookie)
      .send({ organizationPublicId: a.orgId, status: 'VIEWED' })
      .expect(200);

    const contactAudit = await prisma.auditEvent.findFirst({
      where: { action: 'crm.contact.created' },
    });
    const statusAudit = await prisma.auditEvent.findFirst({
      where: { action: 'crm.lead.status_changed' },
    });
    expect(contactAudit).toBeTruthy();
    expect(statusAudit).toBeTruthy();
    expect(JSON.stringify(contactAudit?.after ?? {})).not.toMatch(/password|token/i);
  });

  it('12. assign lead is idempotent for the same assignee', async () => {
    const a = await createMarketplaceLead();
    const first = await request(app.getHttpServer())
      .post(`/api/v1/crm/leads/${a.leadPublicId}/assign`)
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        assigneeUserPublicId: a.dev.publicId,
      })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post(`/api/v1/crm/leads/${a.leadPublicId}/assign`)
      .set('Cookie', a.dev.cookie)
      .send({
        organizationPublicId: a.orgId,
        assigneeUserPublicId: a.dev.publicId,
      })
      .expect(201);
    expect(second.body.recipientUserPublicId).toBe(first.body.recipientUserPublicId);
  });
});
