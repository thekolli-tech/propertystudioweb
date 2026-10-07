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
        description: 'Phase 15B agency',
        operatingZones: ['Gachibowli'],
        propertyTypes: ['Apartment'],
        headquartersCity: 'Hyderabad',
        specialization: 'Resale',
        reraNumber: 'RERA-TEST-001',
      },
    })
    .expect(201);
  return {
    orgPublicId: response.body.organization.publicId as string,
    agencyPublicId: response.body.agencyProfile.publicId as string,
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

async function createAndSubmitAgentCase(
  app: INestApplication,
  cookie: string,
  orgPublicId: string,
  agencyPublicId: string,
) {
  const created = await request(app.getHttpServer())
    .post('/api/v1/verification/cases')
    .set('Cookie', cookie)
    .send({
      organizationPublicId: orgPublicId,
      subjectType: 'AGENT',
      subjectPublicId: agencyPublicId,
      verificationType: 'AGENT',
      reraNumber: 'RERA-HYD-15B',
      declarationAccepted: false,
    })
    .expect(201);

  expect(created.body.processingFeeStatus).toBe('REQUIRED');
  expect(created.body.reviewEligible).toBe(false);

  const submitted = await request(app.getHttpServer())
    .post(`/api/v1/verification/cases/${created.body.publicId}/submit`)
    .set('Cookie', cookie)
    .send({ declarationAccepted: true })
    .expect(201);

  expect(submitted.body.status).toBe('SUBMITTED');
  expect(submitted.body.processingFeeStatus).toBe('REQUIRED');
  expect(submitted.body.reviewEligible).toBe(false);
  return submitted.body as {
    publicId: string;
    processingFeeStatus: string;
    reviewEligible: boolean;
  };
}

describe('Phase 15B agent verification & professional operations', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.verificationDocument.deleteMany();
    await prisma.verificationCase.updateMany({ data: { processingFeeTransactionId: null } });
    await prisma.verificationCase.deleteMany();
    await prisma.financialTransaction.deleteMany();
    await prisma.property.deleteMany();
    await prisma.planEntitlement.deleteMany();
    await prisma.organizationSubscription.deleteMany();
    await prisma.subscriptionPlan.deleteMany();
    await prisma.agencyProfile.deleteMany();
    await prisma.organizationMembership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.userPlatformRole.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('1-4. unverified/pending cannot create listings; public mutate denied', async () => {
    const agent = await register(app, `agent-unverified-${Date.now()}@example.com`);
    const { orgPublicId, agencyPublicId } = await onboardAgency(
      app,
      agent.cookie,
      'Unverified Agency',
    );
    await switchOrg(app, agent.cookie, orgPublicId);

    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', agent.cookie)
      .send({
        organizationPublicId: orgPublicId,
        title: 'Blocked listing',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        priceMinor: '500000000',
        currency: 'INR',
        availabilityStatus: 'AVAILABLE',
        countryCode: 'IN',
      })
      .expect(403);

    await createAndSubmitAgentCase(app, agent.cookie, orgPublicId, agencyPublicId);

    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', agent.cookie)
      .send({
        organizationPublicId: orgPublicId,
        title: 'Still blocked while pending',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        priceMinor: '500000000',
        currency: 'INR',
        availabilityStatus: 'AVAILABLE',
        countryCode: 'IN',
      })
      .expect(403);

    const seeker = await register(app, `seeker-${Date.now()}@example.com`);
    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', seeker.cookie)
      .send({
        organizationPublicId: orgPublicId,
        title: 'Seeker cannot mutate',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        priceMinor: '100',
        currency: 'INR',
        availabilityStatus: 'AVAILABLE',
        countryCode: 'IN',
      })
      .expect(404);
  });

  it('5-6,10-13. fee does not verify; admin approve grants access; suspend blocks; reject blocks', async () => {
    const agent = await register(app, `agent-flow-${Date.now()}@example.com`);
    const { orgPublicId, agencyPublicId } = await onboardAgency(app, agent.cookie, 'Flow Agency');
    await switchOrg(app, agent.cookie, orgPublicId);
    const caseBody = await createAndSubmitAgentCase(app, agent.cookie, orgPublicId, agencyPublicId);

    const admin = await grantPlatformRole(app, prisma, `admin-${Date.now()}@example.com`, 'ADMIN');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/verification/${caseBody.publicId}/approve`)
      .set('Cookie', admin.cookie)
      .send({})
      .expect(409);

    const fee = await request(app.getHttpServer())
      .post('/api/v1/agent/verification/processing-fee')
      .set('Cookie', agent.cookie)
      .send({
        organizationPublicId: orgPublicId,
        verificationCasePublicId: caseBody.publicId,
        idempotencyKey: `fee-${Date.now()}`,
      })
      .expect(201);

    expect(fee.body.transaction.type).toBe('AGENT_VERIFICATION_FEE');
    expect(fee.body.transaction.status).toBe('CAPTURED');
    expect(fee.body.verificationCase.processingFeeStatus).toBe('PAID');
    expect(fee.body.verificationCase.reviewEligible).toBe(true);

    const profileAfterFee = await request(app.getHttpServer())
      .get(`/api/v1/org/${orgPublicId}/agent/status`)
      .set('Cookie', agent.cookie)
      .expect(200);
    expect(profileAfterFee.body.verificationStatus).toBe('PENDING');
    expect(profileAfterFee.body.verifiedBadge).toBe(false);
    expect(profileAfterFee.body.listingAccess).toBe(false);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/verification/${caseBody.publicId}/approve`)
      .set('Cookie', agent.cookie)
      .send({})
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/verification/${caseBody.publicId}/approve`)
      .set('Cookie', admin.cookie)
      .send({})
      .expect(201);

    const status = await request(app.getHttpServer())
      .get(`/api/v1/org/${orgPublicId}/agent/status`)
      .set('Cookie', agent.cookie)
      .expect(200);
    expect(status.body.verificationStatus).toBe('VERIFIED');
    expect(status.body.verifiedBadge).toBe(true);
    expect(status.body.listingAccess).toBe(true);

    const listing = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', agent.cookie)
      .send({
        organizationPublicId: orgPublicId,
        title: 'Verified listing',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        priceMinor: '750000000',
        currency: 'INR',
        availabilityStatus: 'AVAILABLE',
        countryCode: 'IN',
      })
      .expect(201);
    expect(listing.body.publicId).toMatch(/^PS-PROP-/);
    expect(JSON.stringify(listing.body)).not.toMatch(/storageKey|objectKey/i);

    const publicProfile = await request(app.getHttpServer())
      .get(`/api/v1/agents/${agencyPublicId}`)
      .expect(200);
    expect(publicProfile.body.verifiedBadge).toBe(true);
    expect(publicProfile.body).not.toHaveProperty('contactEmail');
    expect(publicProfile.body).not.toHaveProperty('contactPhone');
    expect(JSON.stringify(publicProfile.body)).not.toMatch(/storageKey/i);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/verification/${caseBody.publicId}/suspend`)
      .set('Cookie', admin.cookie)
      .send({ rejectionReason: 'Policy violation' })
      .expect(201);

    const suspended = await request(app.getHttpServer())
      .get(`/api/v1/org/${orgPublicId}/agent/status`)
      .set('Cookie', agent.cookie)
      .expect(200);
    expect(suspended.body.verificationStatus).toBe('SUSPENDED');
    expect(suspended.body.verifiedBadge).toBe(false);
    expect(suspended.body.listingAccess).toBe(false);

    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', agent.cookie)
      .send({
        organizationPublicId: orgPublicId,
        title: 'Suspended blocked',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        priceMinor: '100',
        currency: 'INR',
        availabilityStatus: 'AVAILABLE',
        countryCode: 'IN',
      })
      .expect(403);

    const publicSuspended = await request(app.getHttpServer())
      .get(`/api/v1/agents/${agencyPublicId}`)
      .expect(200);
    expect(publicSuspended.body.verifiedBadge).toBe(false);
  });

  it('7-9,14-16. cross-tenant denial; docs private; marketplace entitlement; audit; staff isolation', async () => {
    const agentA = await register(app, `agent-a-${Date.now()}@example.com`);
    const agentB = await register(app, `agent-b-${Date.now()}@example.com`);
    const a = await onboardAgency(app, agentA.cookie, 'Agency A');
    const b = await onboardAgency(app, agentB.cookie, 'Agency B');
    await switchOrg(app, agentA.cookie, a.orgPublicId);
    await switchOrg(app, agentB.cookie, b.orgPublicId);

    const caseA = await createAndSubmitAgentCase(
      app,
      agentA.cookie,
      a.orgPublicId,
      a.agencyPublicId,
    );

    await request(app.getHttpServer())
      .get(`/api/v1/verification/cases/${caseA.publicId}`)
      .set('Cookie', agentB.cookie)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/org/${a.orgPublicId}/agent/workspace`)
      .set('Cookie', agentB.cookie)
      .expect(404);

    const eligibility = await request(app.getHttpServer())
      .get(`/api/v1/org/${a.orgPublicId}/agent/status`)
      .set('Cookie', agentA.cookie)
      .expect(200);
    expect(eligibility.body.marketplaceAccess).toBe(false);

    const audits = await prisma.auditEvent.findMany({
      where: { action: { startsWith: 'verification.' } },
      take: 20,
    });
    expect(audits.length).toBeGreaterThan(0);
    for (const row of audits) {
      const blob = JSON.stringify(row);
      expect(blob).not.toMatch(/password|sessionToken|apiKey|RAZORPAY|storageKey/i);
    }
  });

  it('17. expired verification cannot retain privileged access', async () => {
    const agent = await register(app, `agent-exp-${Date.now()}@example.com`);
    const { orgPublicId, agencyPublicId } = await onboardAgency(app, agent.cookie, 'Expiry Agency');
    await switchOrg(app, agent.cookie, orgPublicId);
    const caseBody = await createAndSubmitAgentCase(app, agent.cookie, orgPublicId, agencyPublicId);
    const admin = await grantPlatformRole(
      app,
      prisma,
      `admin-exp-${Date.now()}@example.com`,
      'ADMIN',
    );

    await request(app.getHttpServer())
      .post('/api/v1/agent/verification/processing-fee')
      .set('Cookie', agent.cookie)
      .send({
        organizationPublicId: orgPublicId,
        verificationCasePublicId: caseBody.publicId,
        idempotencyKey: `fee-exp-${Date.now()}`,
      })
      .expect(201);

    const past = new Date(Date.now() - 86_400_000).toISOString();
    await request(app.getHttpServer())
      .post(`/api/v1/admin/verification/${caseBody.publicId}/approve`)
      .set('Cookie', admin.cookie)
      .send({ expiresAt: past })
      .expect(201);

    const status = await request(app.getHttpServer())
      .get(`/api/v1/org/${orgPublicId}/agent/status`)
      .set('Cookie', agent.cookie)
      .expect(200);
    expect(status.body.verificationStatus).toBe('VERIFIED');
    expect(status.body.verifiedBadge).toBe(false);
    expect(status.body.listingAccess).toBe(false);
    expect(status.body.renewalStatus).toBe('EXPIRED');

    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set('Cookie', agent.cookie)
      .send({
        organizationPublicId: orgPublicId,
        title: 'Expired blocked',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        priceMinor: '100',
        currency: 'INR',
        availabilityStatus: 'AVAILABLE',
        countryCode: 'IN',
      })
      .expect(403);
  });
});
