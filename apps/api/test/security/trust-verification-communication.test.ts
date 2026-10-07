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
        description: 'Phase 10 developer',
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
        description: 'Phase 10 agency',
        operatingZones: ['Hyderabad'],
        headquartersCity: 'Hyderabad',
        specialization: 'Residential',
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

/** Seeds a buyer→org CRM relationship so review eligibility can be established. */
async function seedReviewEligibility(
  prisma: PrismaService,
  input: {
    buyerUserPublicId: string;
    organizationPublicId: string;
    mode: 'SITE_VISITOR' | 'VERIFIED_CLIENT';
    propertyId?: string;
    projectId?: string;
  },
) {
  const buyer = await prisma.user.findFirstOrThrow({
    where: { publicId: input.buyerUserPublicId },
  });
  const organization = await prisma.organization.findFirstOrThrow({
    where: { publicId: input.organizationPublicId },
  });

  const requirement = await prisma.requirement.create({
    data: {
      id: newUuid(),
      publicId: `PS-REQ-${Date.now()}${Math.floor(Math.random() * 1000)}`,
      ownerUserId: buyer.id,
      propertyType: 'APARTMENT',
      transactionType: 'BUY',
      configuration: 'THREE_BHK',
      bedrooms: 3,
      budgetMinMinor: 10000000n,
      budgetMaxMinor: 20000000n,
      currency: 'INR',
      city: 'Hyderabad',
      locality: 'Tellapur',
      status: 'ACTIVE',
      visibility: 'MARKETPLACE',
    },
  });

  const lead = await prisma.lead.create({
    data: {
      id: newUuid(),
      publicId: `PS-LEAD-${Date.now()}${Math.floor(Math.random() * 1000)}`,
      requirementId: requirement.id,
      recipientOrganizationId: organization.id,
      matchedPropertyId: input.propertyId ?? null,
      matchedProjectId: input.projectId ?? null,
      matchScore: 80,
      matchedCriteria: {},
      unmatchedCriteria: {},
      matchExplanation: 'Test eligibility lead',
      status: 'QUALIFIED',
    },
  });

  if (input.mode === 'SITE_VISITOR') {
    await prisma.crmSiteVisit.create({
      data: {
        id: newUuid(),
        publicId: `PS-VISIT-${Date.now()}${Math.floor(Math.random() * 1000)}`,
        organizationId: organization.id,
        leadId: lead.id,
        propertyId: input.propertyId ?? null,
        projectId: input.projectId ?? null,
        scheduledAt: new Date(),
        status: 'COMPLETED',
      },
    });
  } else {
    await prisma.crmDeal.create({
      data: {
        id: newUuid(),
        publicId: `PS-DEAL-${Date.now()}${Math.floor(Math.random() * 1000)}`,
        organizationId: organization.id,
        leadId: lead.id,
        propertyId: input.propertyId ?? null,
        projectId: input.projectId ?? null,
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });
  }

  return { requirementId: requirement.id, leadId: lead.id };
}

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

describe('Phase 10 trust verification communication security', () => {
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
    await prisma.$executeRawUnsafe('DELETE FROM valuation_estimates');
    await prisma.$executeRawUnsafe('DELETE FROM floor_plan_analyses');
    await prisma.$executeRawUnsafe('DELETE FROM document_analyses');
    await prisma.$executeRawUnsafe('DELETE FROM ai_jobs');
    await prisma.$executeRawUnsafe('DELETE FROM intelligence_observations');
    await prisma.$executeRawUnsafe('DELETE FROM infrastructure_assets');
    await prisma.$executeRawUnsafe('DELETE FROM market_snapshots');
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

  async function createPublishedRequirement(cookie: string, notes = 'buyer notes 9999999999') {
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
        notes,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/requirements/${created.body.publicId}/publish`)
      .set('Cookie', cookie)
      .expect(201);

    return created.body.publicId as string;
  }

  async function submitAgencyVerification(
    agentCookie: string,
    orgPublicId: string,
    profilePublicId: string,
  ) {
    const created = await request(app.getHttpServer())
      .post('/api/v1/verification/cases')
      .set('Cookie', agentCookie)
      .send({
        organizationPublicId: orgPublicId,
        subjectType: 'AGENT',
        subjectPublicId: profilePublicId,
        verificationType: 'AGENT',
        reraNumber: 'RERA-TEST-001',
        declarationAccepted: false,
      })
      .expect(201);

    const submitted = await request(app.getHttpServer())
      .post(`/api/v1/verification/cases/${created.body.publicId}/submit`)
      .set('Cookie', agentCookie)
      .send({ declarationAccepted: true })
      .expect(201);

    expect(submitted.body.status).toBe('SUBMITTED');
    return submitted.body.publicId as string;
  }

  describe('verification', () => {
    it('submits agency AGENT verification and isolates tenants', async () => {
      const agent = await register(app, `agent-v-${Date.now()}@example.com`, []);
      const agency = await onboardAgency(app, agent.cookie, `Agency V ${Date.now()}`);
      await switchOrg(app, agent.cookie, agency.orgPublicId);

      const casePublicId = await submitAgencyVerification(
        agent.cookie,
        agency.orgPublicId,
        agency.profilePublicId,
      );

      const own = await request(app.getHttpServer())
        .get(`/api/v1/verification/cases/${casePublicId}`)
        .set('Cookie', agent.cookie)
        .expect(200);
      expect(own.body.subjectType).toBe('AGENT');
      expect(own.body.subjectPublicId).toBe(agency.profilePublicId);

      const other = await register(app, `agent-b-${Date.now()}@example.com`, []);
      const otherAgency = await onboardAgency(app, other.cookie, `Agency B ${Date.now()}`);
      await switchOrg(app, other.cookie, otherAgency.orgPublicId);

      await request(app.getHttpServer())
        .get(`/api/v1/verification/cases/${casePublicId}`)
        .set('Cookie', other.cookie)
        .expect(404);
    });

    it('blocks unauthorized reviewers and supports approve/reject/request-changes/revoke', async () => {
      const admin = await grantAdmin(app, prisma, `admin-v-${Date.now()}@example.com`);

      const agent = await register(app, `agent-flow-${Date.now()}@example.com`, []);
      const agency = await onboardAgency(app, agent.cookie, `Agency Flow ${Date.now()}`);
      await switchOrg(app, agent.cookie, agency.orgPublicId);
      const approveCaseId = await submitAgencyVerification(
        agent.cookie,
        agency.orgPublicId,
        agency.profilePublicId,
      );

      await request(app.getHttpServer())
        .post(`/api/v1/admin/verification/${approveCaseId}/approve`)
        .set('Cookie', agent.cookie)
        .send({ reviewerNotes: 'should not work' })
        .expect(403);

      const approved = await request(app.getHttpServer())
        .post(`/api/v1/admin/verification/${approveCaseId}/approve`)
        .set('Cookie', admin.cookie)
        .send({ reviewerNotes: 'Looks good' })
        .expect(201);
      expect(approved.body.status).toBe('APPROVED');

      const profile = await prisma.agencyProfile.findFirstOrThrow({
        where: { publicId: agency.profilePublicId },
      });
      expect(profile.verificationStatus).toBe('VERIFIED');

      const approveAudit = await prisma.auditEvent.findFirst({
        where: { action: 'verification.case.approved', resourceId: approveCaseId },
      });
      expect(approveAudit).toBeTruthy();

      const notifications = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', agent.cookie)
        .expect(200);
      expect(
        notifications.body.notifications.some(
          (row: { type: string }) => row.type === 'VERIFICATION_APPROVED',
        ),
      ).toBe(true);

      const agent2 = await register(app, `agent-rej-${Date.now()}@example.com`, []);
      const agency2 = await onboardAgency(app, agent2.cookie, `Agency Rej ${Date.now()}`);
      await switchOrg(app, agent2.cookie, agency2.orgPublicId);
      const rejectCaseId = await submitAgencyVerification(
        agent2.cookie,
        agency2.orgPublicId,
        agency2.profilePublicId,
      );
      const rejected = await request(app.getHttpServer())
        .post(`/api/v1/admin/verification/${rejectCaseId}/reject`)
        .set('Cookie', admin.cookie)
        .send({ rejectionReason: 'Incomplete docs' })
        .expect(201);
      expect(rejected.body.status).toBe('REJECTED');

      const agent3 = await register(app, `agent-chg-${Date.now()}@example.com`, []);
      const agency3 = await onboardAgency(app, agent3.cookie, `Agency Chg ${Date.now()}`);
      await switchOrg(app, agent3.cookie, agency3.orgPublicId);
      const changesCaseId = await submitAgencyVerification(
        agent3.cookie,
        agency3.orgPublicId,
        agency3.profilePublicId,
      );
      const changes = await request(app.getHttpServer())
        .post(`/api/v1/admin/verification/${changesCaseId}/request-changes`)
        .set('Cookie', admin.cookie)
        .send({ reviewerNotes: 'Need clearer RERA scan' })
        .expect(201);
      expect(changes.body.status).toBe('CHANGES_REQUESTED');

      const revoked = await request(app.getHttpServer())
        .post(`/api/v1/admin/verification/${approveCaseId}/revoke`)
        .set('Cookie', admin.cookie)
        .send({ rejectionReason: 'Fraud review' })
        .expect(201);
      expect(revoked.body.status).toBe('REVOKED');
      const revokedProfile = await prisma.agencyProfile.findFirstOrThrow({
        where: { publicId: agency.profilePublicId },
      });
      expect(revokedProfile.verificationStatus).not.toBe('VERIFIED');
    });

    it('authorizes verification documents to case org/admin and denies cross-tenant', async () => {
      const admin = await grantAdmin(app, prisma, `admin-doc-${Date.now()}@example.com`);
      const agent = await register(app, `agent-doc-${Date.now()}@example.com`, []);
      const agency = await onboardAgency(app, agent.cookie, `Agency Doc ${Date.now()}`);
      await switchOrg(app, agent.cookie, agency.orgPublicId);

      const created = await request(app.getHttpServer())
        .post('/api/v1/verification/cases')
        .set('Cookie', agent.cookie)
        .send({
          organizationPublicId: agency.orgPublicId,
          subjectType: 'AGENT',
          subjectPublicId: agency.profilePublicId,
          verificationType: 'AGENT',
          declarationAccepted: false,
        })
        .expect(201);

      const doc = await request(app.getHttpServer())
        .post(`/api/v1/verification/cases/${created.body.publicId}/documents`)
        .set('Cookie', agent.cookie)
        .send({
          documentType: 'RERA_CERTIFICATE',
          storageKey: `organizations/${agency.orgPublicId}/verification/${created.body.publicId}/documents/rera.pdf`,
          mimeType: 'application/pdf',
          title: 'RERA Certificate',
          fileSizeBytes: '2048',
          extractedReference: 'RERA-HYD-123',
        })
        .expect(201);
      expect(doc.body.documentType).toBe('RERA_CERTIFICATE');
      expect(doc.body.storageKey).toBeUndefined();

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/verification/cases/${created.body.publicId}`)
        .set('Cookie', agent.cookie)
        .expect(200);
      expect(detail.body.documents).toHaveLength(1);
      expect(detail.body.documents[0].storageKey).toBeUndefined();

      const access = await request(app.getHttpServer())
        .get(
          `/api/v1/verification/cases/${created.body.publicId}/documents/${doc.body.publicId}/access`,
        )
        .set('Cookie', agent.cookie)
        .expect(200);
      expect(access.body.url).toMatch(/^https?:\/\//);
      expect(access.body.expiresInSeconds).toBeGreaterThan(0);
      expect(access.body.expiresAt).toBeTruthy();
      expect(access.body).not.toHaveProperty('storageKey');
      expect(JSON.stringify(access.body)).not.toMatch(/S3_SECRET_ACCESS_KEY/);
      // SigV4 includes access-key ID in X-Amz-Credential; the secret must never appear as a raw field.
      expect(access.body.url).toContain('X-Amz-Signature=');
      expect(access.body.url).toContain('X-Amz-Expires=');

      const adminAccess = await request(app.getHttpServer())
        .get(
          `/api/v1/verification/cases/${created.body.publicId}/documents/${doc.body.publicId}/access`,
        )
        .set('Cookie', admin.cookie)
        .expect(200);
      expect(adminAccess.body.url).toMatch(/^https?:\/\//);

      await request(app.getHttpServer())
        .patch(`/api/v1/verification/cases/${created.body.publicId}/documents/${doc.body.publicId}`)
        .set('Cookie', admin.cookie)
        .send({ status: 'ACCEPTED', reviewerNotes: 'clear scan' })
        .expect(200);

      const outsider = await register(app, `agent-xdoc-${Date.now()}@example.com`, []);
      const otherAgency = await onboardAgency(app, outsider.cookie, `Agency XDoc ${Date.now()}`);
      await switchOrg(app, outsider.cookie, otherAgency.orgPublicId);

      await request(app.getHttpServer())
        .get(`/api/v1/verification/cases/${created.body.publicId}`)
        .set('Cookie', outsider.cookie)
        .expect(404);

      await request(app.getHttpServer())
        .get(
          `/api/v1/verification/cases/${created.body.publicId}/documents/${doc.body.publicId}/access`,
        )
        .set('Cookie', outsider.cookie)
        .expect(404);

      const stranger = await register(app, `stranger-doc-${Date.now()}@example.com`);
      await request(app.getHttpServer())
        .get(
          `/api/v1/verification/cases/${created.body.publicId}/documents/${doc.body.publicId}/access`,
        )
        .set('Cookie', stranger.cookie)
        .expect(404);

      await request(app.getHttpServer())
        .get(
          `/api/v1/verification/cases/${created.body.publicId}/documents/${doc.body.publicId}/access`,
        )
        .expect(401);

      await request(app.getHttpServer())
        .get(`/api/v1/verification/cases/${created.body.publicId}/documents/PS-VDOC-999999/access`)
        .set('Cookie', agent.cookie)
        .expect(404);

      await request(app.getHttpServer())
        .post(`/api/v1/verification/cases/${created.body.publicId}/documents`)
        .set('Cookie', outsider.cookie)
        .send({
          documentType: 'GOVERNMENT_ID',
          storageKey: 'evil/key.pdf',
          mimeType: 'application/pdf',
          title: 'Evil Doc',
          fileSizeBytes: '100',
        })
        .expect(404);
    });
  });

  describe('reviews', () => {
    it('allows eligible reviewers, blocks unauthorized, reports, moderates, and hides PII', async () => {
      const admin = await grantAdmin(app, prisma, `admin-rev-${Date.now()}@example.com`);
      const agent = await register(app, `agent-rev-${Date.now()}@example.com`, []);
      const agency = await onboardAgency(app, agent.cookie, `Agency Rev ${Date.now()}`);
      await prisma.agencyProfile.update({
        where: { publicId: agency.profilePublicId },
        data: { verificationStatus: 'VERIFIED' },
      });

      const reviewer = await register(app, `reviewer-${Date.now()}@example.com`);
      await seedReviewEligibility(prisma, {
        buyerUserPublicId: reviewer.publicId,
        organizationPublicId: agency.orgPublicId,
        mode: 'VERIFIED_CLIENT',
      });
      const created = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Cookie', reviewer.cookie)
        .send({
          subjectType: 'AGENT',
          subjectPublicId: agency.profilePublicId,
          title: 'Solid experience',
          body: 'Worked with this agency on a villa purchase and they were responsive.',
          overallRating: 5,
          ratings: [
            { dimension: 'EXECUTION', rating: 5 },
            { dimension: 'DOCUMENTATION', rating: 4 },
          ],
        })
        .expect(201);
      expect(created.body.status).toBe('PUBLISHED');
      expect(created.body.eligibilityBasis).toBe('VERIFIED_CLIENT');
      expect(created.body.moderatorNotes).toBeUndefined();
      expect(created.body.authorEmail).toBeUndefined();

      const genericUser = await register(app, `generic-rev-${Date.now()}@example.com`);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Cookie', genericUser.cookie)
        .send({
          subjectType: 'AGENT',
          subjectPublicId: agency.profilePublicId,
          body: 'I have an account but no relationship to this agency.',
          overallRating: 1,
          ratings: [],
        })
        .expect(403);

      const noPerms = await register(app, `noperm-${Date.now()}@example.com`, []);
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Cookie', noPerms.cookie)
        .send({
          subjectType: 'AGENT',
          subjectPublicId: agency.profilePublicId,
          body: 'This user has no review permission at all.',
          overallRating: 1,
          ratings: [],
        })
        .expect(403);

      const report = await request(app.getHttpServer())
        .post(`/api/v1/reviews/${created.body.publicId}/report`)
        .set('Cookie', reviewer.cookie)
        .send({ reason: 'SPAM', details: 'Looks promotional' })
        .expect(201);
      expect(report.body.reason).toBe('SPAM');

      const moderated = await request(app.getHttpServer())
        .post(`/api/v1/admin/reviews/${created.body.publicId}/moderate`)
        .set('Cookie', admin.cookie)
        .send({ action: 'HIDE', moderatorNotes: 'hidden for spam review' })
        .expect(201);
      expect(moderated.body.status).toBe('HIDDEN');

      const list = await request(app.getHttpServer())
        .get(`/api/v1/reviews?subjectType=AGENT&subjectPublicId=${agency.profilePublicId}`)
        .set('Cookie', reviewer.cookie)
        .expect(200);
      expect(
        list.body.reviews.find(
          (row: { publicId: string }) => row.publicId === created.body.publicId,
        ),
      ).toBeUndefined();
      expect(JSON.stringify(list.body)).not.toMatch(/hidden for spam review|@example\.com/);
    });

    it('enforces relationship eligibility and rejects cross-tenant / subject spoofing', async () => {
      const agentA = await register(app, `agent-elig-a-${Date.now()}@example.com`, []);
      const agencyA = await onboardAgency(app, agentA.cookie, `Agency Elig A ${Date.now()}`);
      const agentB = await register(app, `agent-elig-b-${Date.now()}@example.com`, []);
      const agencyB = await onboardAgency(app, agentB.cookie, `Agency Elig B ${Date.now()}`);

      const buyer = await register(app, `buyer-elig-${Date.now()}@example.com`);
      await seedReviewEligibility(prisma, {
        buyerUserPublicId: buyer.publicId,
        organizationPublicId: agencyA.orgPublicId,
        mode: 'SITE_VISITOR',
      });

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Cookie', buyer.cookie)
        .send({
          subjectType: 'AGENT',
          subjectPublicId: agencyA.profilePublicId,
          body: 'Site visit went well with agency A and staff were helpful.',
          overallRating: 4,
          ratings: [{ dimension: 'EXECUTION', rating: 4 }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Cookie', buyer.cookie)
        .send({
          subjectType: 'AGENT',
          subjectPublicId: agencyB.profilePublicId,
          body: 'Trying to review an unrelated agency using another relationship.',
          overallRating: 2,
          ratings: [],
        })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Cookie', buyer.cookie)
        .send({
          subjectType: 'AGENT',
          subjectPublicId: 'PS-AGT-999999',
          body: 'Unknown subject should not be reviewable.',
          overallRating: 1,
          ratings: [],
        })
        .expect(404);
    });

    it('computes INSUFFICIENT_DATA below 3 reviews and READY formula after 3+', async () => {
      const agent = await register(app, `agent-ts-${Date.now()}@example.com`, []);
      const agency = await onboardAgency(app, agent.cookie, `Agency TS ${Date.now()}`);
      await prisma.agencyProfile.update({
        where: { publicId: agency.profilePublicId },
        data: { verificationStatus: 'VERIFIED' },
      });

      const insufficient = await request(app.getHttpServer())
        .get(
          `/api/v1/reviews/trust-score?subjectType=AGENT&subjectPublicId=${agency.profilePublicId}`,
        )
        .expect(200);
      expect(insufficient.body.state).toBe('INSUFFICIENT_DATA');
      expect(insufficient.body.score).toBeNull();
      expect(insufficient.body.reviewCount).toBe(0);

      const ratings = [
        { overall: 5, structured: [5, 5] },
        { overall: 4, structured: [4, 4] },
        { overall: 3, structured: [3, 3] },
      ] as const;

      for (let i = 0; i < ratings.length; i += 1) {
        const user = await register(app, `ts-user-${i}-${Date.now()}@example.com`);
        await seedReviewEligibility(prisma, {
          buyerUserPublicId: user.publicId,
          organizationPublicId: agency.orgPublicId,
          mode: i === 0 ? 'VERIFIED_CLIENT' : 'SITE_VISITOR',
        });
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', user.cookie)
          .send({
            subjectType: 'AGENT',
            subjectPublicId: agency.profilePublicId,
            body: `Detailed review number ${i + 1} about the agency experience.`,
            overallRating: ratings[i].overall,
            ratings: [
              { dimension: 'EXECUTION', rating: ratings[i].structured[0] },
              { dimension: 'DOCUMENTATION', rating: ratings[i].structured[1] },
            ],
          })
          .expect(201);
      }

      const mid = await request(app.getHttpServer())
        .get(
          `/api/v1/reviews/trust-score?subjectType=AGENT&subjectPublicId=${agency.profilePublicId}`,
        )
        .expect(200);
      // After first two would be insufficient; after three READY.
      // Recompute expected formula from TrustScoreService.
      const overallAvg = (5 + 4 + 3) / 3;
      const structuredAvg = (5 + 5 + 4 + 4 + 3 + 3) / 6;
      const verificationComponent = 5;
      const expected = Math.round(
        Math.min(
          5,
          Math.max(0, (0.6 * overallAvg + 0.25 * structuredAvg + 0.15 * verificationComponent) / 5),
        ) * 100,
      );

      expect(mid.body.state).toBe('READY');
      expect(mid.body.reviewCount).toBe(3);
      expect(mid.body.score).toBe(expected);
      expect(mid.body.verified).toBe(true);
      expect(mid.body.verificationComponent).toBe(5);
    });
  });

  describe('notifications', () => {
    it('creates via verification approve, supports read/read-all, isolates users, and patches preferences', async () => {
      const admin = await grantAdmin(app, prisma, `admin-n-${Date.now()}@example.com`);
      const agent = await register(app, `agent-n-${Date.now()}@example.com`, []);
      const agency = await onboardAgency(app, agent.cookie, `Agency N ${Date.now()}`);
      await switchOrg(app, agent.cookie, agency.orgPublicId);
      const caseId = await submitAgencyVerification(
        agent.cookie,
        agency.orgPublicId,
        agency.profilePublicId,
      );

      await request(app.getHttpServer())
        .post(`/api/v1/admin/verification/${caseId}/approve`)
        .set('Cookie', admin.cookie)
        .send({})
        .expect(201);

      const list = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Cookie', agent.cookie)
        .expect(200);
      expect(list.body.notifications.length).toBeGreaterThanOrEqual(1);
      const first = list.body.notifications[0] as { publicId: string; readAt: string | null };
      expect(first.readAt).toBeNull();

      const readOne = await request(app.getHttpServer())
        .post(`/api/v1/notifications/${first.publicId}/read`)
        .set('Cookie', agent.cookie)
        .expect(201);
      expect(readOne.body.readAt).toBeTruthy();

      const other = await register(app, `other-n-${Date.now()}@example.com`);
      await request(app.getHttpServer())
        .post(`/api/v1/notifications/${first.publicId}/read`)
        .set('Cookie', other.cookie)
        .expect(404);

      await request(app.getHttpServer())
        .post('/api/v1/notifications/read-all')
        .set('Cookie', agent.cookie)
        .expect(201);

      const prefs = await request(app.getHttpServer())
        .get('/api/v1/notifications/preferences')
        .set('Cookie', agent.cookie)
        .expect(200);
      expect(Array.isArray(prefs.body.preferences)).toBe(true);

      const patched = await request(app.getHttpServer())
        .patch('/api/v1/notifications/preferences')
        .set('Cookie', agent.cookie)
        .send({
          preferences: [
            { type: 'VERIFICATION_APPROVED', channel: 'EMAIL', enabled: false },
            { type: 'MESSAGE_RECEIVED', channel: 'IN_APP', enabled: true },
          ],
        })
        .expect(200);
      expect(
        patched.body.preferences.some(
          (row: { type: string; channel: string; enabled: boolean }) =>
            row.type === 'VERIFICATION_APPROVED' &&
            row.channel === 'EMAIL' &&
            row.enabled === false,
        ),
      ).toBe(true);
    });
  });

  describe('communications and lead access', () => {
    async function setupPurchasedLead() {
      const admin = await grantAdmin(app, prisma, `admin-c-${Date.now()}@example.com`);
      const planPublicId = await createPlan(admin.cookie, `COM_${Date.now()}`);

      const seekerEmail = `seeker-c-${Date.now()}@example.com`;
      const seeker = await register(app, seekerEmail);
      const requirementPublicId = await createPublishedRequirement(
        seeker.cookie,
        'private buyer contact 8888888888',
      );

      const agent = await register(app, `agent-c-${Date.now()}@example.com`, []);
      const agency = await onboardAgency(app, agent.cookie, `Agency C ${Date.now()}`);
      await switchOrg(app, agent.cookie, agency.orgPublicId);
      await prisma.agencyProfile.update({
        where: { publicId: agency.profilePublicId },
        data: { verificationStatus: 'VERIFIED' },
      });

      await request(app.getHttpServer())
        .post('/api/v1/subscriptions')
        .set('Cookie', agent.cookie)
        .send({
          organizationPublicId: agency.orgPublicId,
          planPublicId,
          provider: 'SANDBOX',
          idempotencyKey: `sub-c-${Date.now()}`,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/wallet/topup')
        .set('Cookie', agent.cookie)
        .send({
          organizationPublicId: agency.orgPublicId,
          amountMinor: '100000',
          idempotencyKey: `topup-c-${Date.now()}`,
        })
        .expect(201);

      const lead = await request(app.getHttpServer())
        .post('/api/v1/leads/from-requirement')
        .set('Cookie', agent.cookie)
        .send({
          requirementPublicId,
          organizationPublicId: agency.orgPublicId,
        })
        .expect(201);

      return {
        admin,
        seeker,
        seekerEmail,
        agent,
        agency,
        leadPublicId: lead.body.publicId as string,
        requirementPublicId,
      };
    }

    it('blocks unpaid contact reveal; purchase grants access; reveal audited without email metadata', async () => {
      const ctx = await setupPurchasedLead();

      const accessBefore = await request(app.getHttpServer())
        .get(
          `/api/v1/leads/${ctx.leadPublicId}/access?organizationPublicId=${ctx.agency.orgPublicId}`,
        )
        .set('Cookie', ctx.agent.cookie)
        .expect(200);
      expect(accessBefore.body.canReveal).toBe(false);
      expect(accessBefore.body.accessState).toBeNull();

      await request(app.getHttpServer())
        .post(`/api/v1/leads/${ctx.leadPublicId}/contact`)
        .set('Cookie', ctx.agent.cookie)
        .send({ organizationPublicId: ctx.agency.orgPublicId })
        .expect(404);

      const purchase = await request(app.getHttpServer())
        .post('/api/v1/lead-purchases')
        .set('Cookie', ctx.agent.cookie)
        .send({
          organizationPublicId: ctx.agency.orgPublicId,
          leadPublicId: ctx.leadPublicId,
          idempotencyKey: `lp-c-${Date.now()}`,
        })
        .expect(201);
      expect(purchase.body.status).toBe('COMPLETED');

      const accessAfter = await request(app.getHttpServer())
        .get(
          `/api/v1/leads/${ctx.leadPublicId}/access?organizationPublicId=${ctx.agency.orgPublicId}`,
        )
        .set('Cookie', ctx.agent.cookie)
        .expect(200);
      expect(accessAfter.body.canReveal).toBe(true);
      expect(['PURCHASED', 'ACTIVE']).toContain(accessAfter.body.accessState);

      const reveal = await request(app.getHttpServer())
        .post(`/api/v1/leads/${ctx.leadPublicId}/contact`)
        .set('Cookie', ctx.agent.cookie)
        .send({ organizationPublicId: ctx.agency.orgPublicId })
        .expect(201);
      expect(reveal.body.contact.email).toBe(ctx.seekerEmail);

      const audit = await prisma.auditEvent.findFirst({
        where: { action: 'lead.contact.revealed' },
      });
      expect(audit).toBeTruthy();
      expect(JSON.stringify(audit?.metadata ?? {})).not.toMatch(/@example\.com|8888888888/);

      const publicList = await request(app.getHttpServer())
        .get('/api/v1/public/requirements')
        .expect(200);
      expect(JSON.stringify(publicList.body)).not.toMatch(
        new RegExp(`${ctx.seekerEmail}|8888888888|private buyer contact`),
      );

      const stranger = await register(app, `stranger-${Date.now()}@example.com`, []);
      const strangerOrg = await onboardDeveloper(app, stranger.cookie, `Dev Str ${Date.now()}`);
      await switchOrg(app, stranger.cookie, strangerOrg.orgPublicId);
      await request(app.getHttpServer())
        .post(`/api/v1/leads/${ctx.leadPublicId}/contact`)
        .set('Cookie', stranger.cookie)
        .send({ organizationPublicId: strangerOrg.orgPublicId })
        .expect(404);

      await request(app.getHttpServer())
        .post('/api/v1/leads/PS-LEAD-999999999/contact')
        .set('Cookie', ctx.agent.cookie)
        .send({ organizationPublicId: ctx.agency.orgPublicId })
        .expect(404);
    });

    it('authorizes lead conversations after purchase and denies cross-tenant / non-participants', async () => {
      const ctx = await setupPurchasedLead();

      await request(app.getHttpServer())
        .post('/api/v1/conversations')
        .set('Cookie', ctx.agent.cookie)
        .send({
          type: 'LEAD',
          organizationPublicId: ctx.agency.orgPublicId,
          leadPublicId: ctx.leadPublicId,
          initialMessage: 'Hello from agency before purchase',
        })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/v1/lead-purchases')
        .set('Cookie', ctx.agent.cookie)
        .send({
          organizationPublicId: ctx.agency.orgPublicId,
          leadPublicId: ctx.leadPublicId,
          idempotencyKey: `lp-conv-${Date.now()}`,
        })
        .expect(201);

      const conversation = await request(app.getHttpServer())
        .post('/api/v1/conversations')
        .set('Cookie', ctx.agent.cookie)
        .send({
          type: 'LEAD',
          organizationPublicId: ctx.agency.orgPublicId,
          leadPublicId: ctx.leadPublicId,
          subjectLabel: 'Lead follow-up',
          initialMessage: 'Hello, we can help with your Tellapur villa search.',
        })
        .expect(201);
      expect(conversation.body.publicId).toMatch(/^PS-/);
      expect(conversation.body.participants.length).toBeGreaterThanOrEqual(2);

      const outsider = await register(app, `outsider-c-${Date.now()}@example.com`);
      await request(app.getHttpServer())
        .post('/api/v1/conversations')
        .set('Cookie', outsider.cookie)
        .send({
          type: 'LEAD',
          organizationPublicId: ctx.agency.orgPublicId,
          leadPublicId: ctx.leadPublicId,
        })
        .expect(404);

      await request(app.getHttpServer())
        .get(`/api/v1/conversations/${conversation.body.publicId}`)
        .set('Cookie', outsider.cookie)
        .expect(404);

      await request(app.getHttpServer())
        .get('/api/v1/conversations/PS-CONV-999999999')
        .set('Cookie', ctx.agent.cookie)
        .expect(404);

      const message = await request(app.getHttpServer())
        .post(`/api/v1/conversations/${conversation.body.publicId}/messages`)
        .set('Cookie', ctx.agent.cookie)
        .send({ body: 'Following up on your requirement.' })
        .expect(201);
      expect(message.body.body).toContain('Following up');

      await request(app.getHttpServer())
        .post(`/api/v1/conversations/${conversation.body.publicId}/messages`)
        .set('Cookie', outsider.cookie)
        .send({ body: 'I should not be able to write here.' })
        .expect(404);

      const seekerView = await request(app.getHttpServer())
        .get(`/api/v1/conversations/${conversation.body.publicId}`)
        .set('Cookie', ctx.seeker.cookie)
        .expect(200);
      expect(seekerView.body.messages.length).toBeGreaterThanOrEqual(1);

      const otherDev = await register(app, `dev-x-${Date.now()}@example.com`, []);
      const otherOrg = await onboardDeveloper(app, otherDev.cookie, `Dev X ${Date.now()}`);
      await switchOrg(app, otherDev.cookie, otherOrg.orgPublicId);
      await request(app.getHttpServer())
        .post('/api/v1/conversations')
        .set('Cookie', otherDev.cookie)
        .send({
          type: 'LEAD',
          organizationPublicId: otherOrg.orgPublicId,
          leadPublicId: ctx.leadPublicId,
        })
        .expect(404);
    });
  });

  describe('cross-tenant security denials', () => {
    it('denies cross-tenant verification and arbitrary conversation/lead IDs', async () => {
      const agentA = await register(app, `agent-sec-a-${Date.now()}@example.com`, []);
      const agencyA = await onboardAgency(app, agentA.cookie, `Agency Sec A ${Date.now()}`);
      await switchOrg(app, agentA.cookie, agencyA.orgPublicId);
      const caseId = await submitAgencyVerification(
        agentA.cookie,
        agencyA.orgPublicId,
        agencyA.profilePublicId,
      );

      const agentB = await register(app, `agent-sec-b-${Date.now()}@example.com`, []);
      const agencyB = await onboardAgency(app, agentB.cookie, `Agency Sec B ${Date.now()}`);
      await switchOrg(app, agentB.cookie, agencyB.orgPublicId);

      await request(app.getHttpServer())
        .get(`/api/v1/verification/cases/${caseId}`)
        .set('Cookie', agentB.cookie)
        .expect(404);

      await request(app.getHttpServer())
        .post(`/api/v1/verification/cases/${caseId}/submit`)
        .set('Cookie', agentB.cookie)
        .send({ declarationAccepted: true })
        .expect(404);

      await request(app.getHttpServer())
        .get('/api/v1/conversations/PS-CONV-000000001')
        .set('Cookie', agentB.cookie)
        .expect(404);

      await request(app.getHttpServer())
        .post('/api/v1/leads/PS-LEAD-000000001/contact')
        .set('Cookie', agentB.cookie)
        .send({ organizationPublicId: agencyB.orgPublicId })
        .expect(404);
    });
  });
});
