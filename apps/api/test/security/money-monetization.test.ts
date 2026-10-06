import { createHmac } from 'node:crypto';

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
        description: 'Billing test developer',
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

async function grantAdmin(app: INestApplication, prisma: PrismaService, email: string) {
  const user = await register(app, email, []);
  await prisma.userPlatformRole.create({
    data: {
      id: newUuid(),
      userId: (await prisma.user.findFirstOrThrow({ where: { publicId: user.publicId } })).id,
      role: 'ADMIN',
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

describe('Phase 9 money monetization security', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '1000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
    process.env.PAYMENTS_PROVIDER = 'SANDBOX';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';

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

  async function createPlan(adminCookie: string, code = `PLAN_${Date.now()}`) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/subscriptions/plans')
      .set('Cookie', adminCookie)
      .send({
        name: 'Growth',
        code,
        billingInterval: 'MONTHLY',
        priceMinor: '99900',
        includedCredits: '100000',
        leadPurchasePriceMinor: '50000',
        entitlements: ['LEAD_MARKETPLACE_ACCESS', 'LEAD_PURCHASE', 'CRM_ACCESS'],
      })
      .expect(201);
    return response.body.publicId as string;
  }

  it('creates subscription with entitlements and isolates tenants', async () => {
    const admin = await grantAdmin(app, prisma, `admin-${Date.now()}@example.com`);
    const planPublicId = await createPlan(admin.cookie);

    const a = await register(app, `dev-a-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, a.cookie, `Dev A ${Date.now()}`);
    await switchOrg(app, a.cookie, orgA);

    const sub = await request(app.getHttpServer())
      .post('/api/v1/subscriptions')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        planPublicId,
        provider: 'SANDBOX',
        idempotencyKey: `sub-a-${Date.now()}`,
      })
      .expect(201);
    expect(sub.body.status).toBe('ACTIVE');
    expect(sub.body.entitlements).toContain('LEAD_PURCHASE');

    const wallet = await request(app.getHttpServer())
      .get(`/api/v1/wallet?organizationPublicId=${orgA}`)
      .set('Cookie', a.cookie)
      .expect(200);
    expect(wallet.body.balanceMinor).toBe('100000');

    const b = await register(app, `dev-b-${Date.now()}@example.com`, []);
    const orgB = await onboardDeveloper(app, b.cookie, `Dev B ${Date.now()}`);
    await switchOrg(app, b.cookie, orgB);

    await request(app.getHttpServer())
      .get(`/api/v1/wallet?organizationPublicId=${orgA}`)
      .set('Cookie', b.cookie)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/payments?organizationPublicId=${orgA}`)
      .set('Cookie', b.cookie)
      .expect(404);
  });

  it('enforces wallet debit insufficient funds and ledger integrity', async () => {
    const admin = await grantAdmin(app, prisma, `admin-w-${Date.now()}@example.com`);
    const planPublicId = await createPlan(admin.cookie, `WAL_${Date.now()}`);
    const a = await register(app, `dev-w-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, a.cookie, `Dev W ${Date.now()}`);
    await switchOrg(app, a.cookie, orgA);
    await request(app.getHttpServer())
      .post('/api/v1/subscriptions')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        planPublicId,
        provider: 'SANDBOX',
        idempotencyKey: `sub-w-${Date.now()}`,
      })
      .expect(201);

    const topupKey = `topup-${Date.now()}`;
    const topup = await request(app.getHttpServer())
      .post('/api/v1/wallet/topup')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        amountMinor: '25000',
        idempotencyKey: topupKey,
      })
      .expect(201);
    expect(topup.body.wallet.balanceMinor).toBe('125000');

    const dup = await request(app.getHttpServer())
      .post('/api/v1/wallet/topup')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        amountMinor: '25000',
        idempotencyKey: topupKey,
      })
      .expect(201);
    expect(dup.body.transaction.publicId).toBe(topup.body.transaction.publicId);

    const ledger = await request(app.getHttpServer())
      .get(`/api/v1/wallet/ledger?organizationPublicId=${orgA}`)
      .set('Cookie', a.cookie)
      .expect(200);
    expect(ledger.body.entries.length).toBeGreaterThanOrEqual(2);
  });

  it('requires entitlement and balance for lead purchase with no PII leakage', async () => {
    const admin = await grantAdmin(app, prisma, `admin-lp-${Date.now()}@example.com`);
    const lockedPlan = await request(app.getHttpServer())
      .post('/api/v1/admin/subscriptions/plans')
      .set('Cookie', admin.cookie)
      .send({
        name: 'Locked',
        code: `LOCKED_${Date.now()}`,
        billingInterval: 'MONTHLY',
        priceMinor: '100',
        includedCredits: '0',
        entitlements: ['CRM_ACCESS'],
      })
      .expect(201);

    const seeker = await register(app, `seeker-${Date.now()}@example.com`);
    const requirement = await request(app.getHttpServer())
      .post('/api/v1/requirements')
      .set('Cookie', seeker.cookie)
      .send({
        propertyType: 'VILLA',
        transactionType: 'BUY',
        city: 'Hyderabad',
        locality: 'Gachibowli',
        notes: 'secret buyer 9999999999',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/requirements/${requirement.body.publicId}/publish`)
      .set('Cookie', seeker.cookie)
      .expect(201);

    const a = await register(app, `dev-lp-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, a.cookie, `Dev LP ${Date.now()}`);
    await switchOrg(app, a.cookie, orgA);
    await request(app.getHttpServer())
      .post('/api/v1/subscriptions')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        planPublicId: lockedPlan.body.publicId,
        provider: 'SANDBOX',
        idempotencyKey: `sub-locked-${Date.now()}`,
      })
      .expect(201);

    const lead = await request(app.getHttpServer())
      .post('/api/v1/leads/from-requirement')
      .set('Cookie', a.cookie)
      .send({ requirementPublicId: requirement.body.publicId, organizationPublicId: orgA })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/lead-purchases')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        leadPublicId: lead.body.publicId,
        idempotencyKey: `lp-fail-${Date.now()}`,
      })
      .expect(403);

    const openPlan = await createPlan(admin.cookie, `OPEN_${Date.now()}`);
    await prisma.organizationSubscription.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    await request(app.getHttpServer())
      .post('/api/v1/subscriptions')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        planPublicId: openPlan,
        provider: 'SANDBOX',
        idempotencyKey: `sub-open-${Date.now()}`,
      })
      .expect(201);

    const purchase = await request(app.getHttpServer())
      .post('/api/v1/lead-purchases')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        leadPublicId: lead.body.publicId,
        idempotencyKey: `lp-ok-${Date.now()}`,
      })
      .expect(201);
    expect(purchase.body.status).toBe('COMPLETED');
    expect(JSON.stringify(purchase.body)).not.toMatch(/9999999999|secret buyer/);

    const publicReqs = await request(app.getHttpServer())
      .get('/api/v1/public/requirements')
      .expect(200);
    expect(JSON.stringify(publicReqs.body)).not.toMatch(/9999999999|secret buyer/);
  });

  it('rejects invalid razorpay webhook signatures and ignores duplicates', async () => {
    const eventBody = {
      id: `evt_${Date.now()}`,
      event: 'payment.captured',
      providerTransactionId: 'missing',
    };
    const payload = JSON.stringify(eventBody);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/razorpay')
      .set('x-razorpay-signature', 'invalid')
      .set('Content-Type', 'application/json')
      .send(eventBody)
      .expect(401);

    const signature = createHmac('sha256', 'test_webhook_secret').update(payload).digest('hex');
    const first = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(eventBody)
      .expect(201);
    expect(first.body.ok).toBe(true);

    const second = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(eventBody)
      .expect(201);
    expect(second.body.duplicate).toBe(true);
  });

  it('denies PROPERTY_ADMIN financial access', async () => {
    const email = `pa-${Date.now()}@example.com`;
    const user = await register(app, email, []);
    await prisma.userPlatformRole.create({
      data: {
        id: newUuid(),
        userId: (await prisma.user.findFirstOrThrow({ where: { publicId: user.publicId } })).id,
        role: 'PROPERTY_ADMIN',
      },
    });
    await request(app.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', user.cookie);
    const relogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'CorrectHorseBattery!' })
      .expect(201);
    const cookie = extractSessionCookie(relogin.headers['set-cookie'])!;

    await request(app.getHttpServer())
      .get('/api/v1/admin/payments')
      .set('Cookie', cookie)
      .expect(403);

    const a = await register(app, `dev-pa-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, a.cookie, `Dev PA ${Date.now()}`);
    await request(app.getHttpServer())
      .get(`/api/v1/billing/overview?organizationPublicId=${orgA}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('cancels subscription and writes audit events', async () => {
    const admin = await grantAdmin(app, prisma, `admin-c-${Date.now()}@example.com`);
    const planPublicId = await createPlan(admin.cookie, `CANCEL_${Date.now()}`);
    const a = await register(app, `dev-c-${Date.now()}@example.com`, []);
    const orgA = await onboardDeveloper(app, a.cookie, `Dev C ${Date.now()}`);
    await switchOrg(app, a.cookie, orgA);
    await request(app.getHttpServer())
      .post('/api/v1/subscriptions')
      .set('Cookie', a.cookie)
      .send({
        organizationPublicId: orgA,
        planPublicId,
        provider: 'SANDBOX',
        idempotencyKey: `sub-c-${Date.now()}`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/subscriptions/cancel')
      .set('Cookie', a.cookie)
      .send({ organizationPublicId: orgA, cancelAtPeriodEnd: true })
      .expect(201);

    const created = await prisma.auditEvent.findFirst({
      where: { action: 'subscription.created' },
    });
    const cancelled = await prisma.auditEvent.findFirst({
      where: { action: 'subscription.cancelled' },
    });
    expect(created).toBeTruthy();
    expect(cancelled).toBeTruthy();
  });
});
