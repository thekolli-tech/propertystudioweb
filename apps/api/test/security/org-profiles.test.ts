import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';

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

describe('Phase 4 organization profiles', () => {
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

  it('onboards a developer organization with profile and owner membership', async () => {
    const owner = await register(app, 'dev-owner@example.com');

    const onboard = await request(app.getHttpServer())
      .post('/api/v1/organizations/onboard')
      .set('Cookie', owner.cookie)
      .send({
        type: 'DEVELOPER',
        name: 'Skyline Builders',
        profile: {
          legalName: 'Skyline Builders Pvt Ltd',
          displayName: 'Skyline Builders',
          description: 'Residential developments across Hyderabad.',
          website: 'https://skyline.example',
          contactEmail: 'hello@skyline.example',
          contactPhone: '+91-9000000001',
          headquartersCity: 'Hyderabad',
          headquartersState: 'Telangana',
          operatingZones: ['Hyderabad', 'Secunderabad'],
        },
      })
      .expect(201);

    expect(onboard.body.organization.publicId).toMatch(/^PS-ORG-\d{6,}$/);
    expect(onboard.body.organization.type).toBe('DEVELOPER');
    expect(onboard.body.organization.role).toBe('DEVELOPER');
    expect(onboard.body.developerProfile.publicId).toMatch(/^PS-DEV-\d{6,}$/);
    expect(onboard.body.developerProfile.displayName).toBe('Skyline Builders');
    expect(onboard.body.agencyProfile).toBeUndefined();

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(me.body.user.activeOrganizationPublicId).toBe(onboard.body.organization.publicId);

    const audits = await prisma.auditEvent.findMany({
      where: { action: { in: ['organization.created', 'developer_profile.created'] } },
    });
    expect(audits.length).toBeGreaterThanOrEqual(2);
  });

  it('onboards an agency organization with unverified verification foundation', async () => {
    const owner = await register(app, 'agency-owner@example.com');

    const onboard = await request(app.getHttpServer())
      .post('/api/v1/organizations/onboard')
      .set('Cookie', owner.cookie)
      .send({
        type: 'AGENCY',
        name: 'Lakeview Realty',
        profile: {
          legalName: 'Lakeview Realty LLP',
          displayName: 'Lakeview Realty',
          specialization: 'Resale apartments',
          operatingZones: ['Bengaluru'],
        },
      })
      .expect(201);

    expect(onboard.body.organization.type).toBe('AGENCY');
    expect(onboard.body.organization.role).toBe('AGENT');
    expect(onboard.body.agencyProfile.publicId).toMatch(/^PS-AGT-\d{6,}$/);
    expect(onboard.body.agencyProfile.verificationStatus).toBe('UNVERIFIED');
  });

  it('updates profiles for members with manage permission and blocks outsiders', async () => {
    const owner = await register(app, 'profile-owner@example.com');
    const outsider = await register(app, 'profile-outsider@example.com');

    const onboard = await request(app.getHttpServer())
      .post('/api/v1/organizations/onboard')
      .set('Cookie', owner.cookie)
      .send({
        type: 'DEVELOPER',
        name: 'Update Co',
        profile: {
          legalName: 'Update Co Pvt Ltd',
          displayName: 'Update Co',
          operatingZones: ['Pune'],
        },
      })
      .expect(201);

    const orgId = onboard.body.organization.publicId as string;

    const updated = await request(app.getHttpServer())
      .put(`/api/v1/organizations/${orgId}/developer-profile`)
      .set('Cookie', owner.cookie)
      .send({ description: 'Updated description', operatingZones: ['Pune', 'Mumbai'] })
      .expect(200);
    expect(updated.body.description).toBe('Updated description');
    expect(updated.body.operatingZones).toEqual(['Pune', 'Mumbai']);

    await request(app.getHttpServer())
      .put(`/api/v1/organizations/${orgId}/developer-profile`)
      .set('Cookie', outsider.cookie)
      .send({ description: 'Hijack' })
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/developer-profile`)
      .set('Cookie', outsider.cookie)
      .expect(404);
  });

  it('enforces cross-tenant isolation for agency profiles and member management', async () => {
    const a = await register(app, 'agency-a@example.com');
    const b = await register(app, 'agency-b@example.com');

    const orgA = await request(app.getHttpServer())
      .post('/api/v1/organizations/onboard')
      .set('Cookie', a.cookie)
      .send({
        type: 'AGENCY',
        name: 'Agency A',
        profile: {
          legalName: 'Agency A LLP',
          displayName: 'Agency A',
          operatingZones: ['Chennai'],
        },
      })
      .expect(201);

    const orgB = await request(app.getHttpServer())
      .post('/api/v1/organizations/onboard')
      .set('Cookie', b.cookie)
      .send({
        type: 'AGENCY',
        name: 'Agency B',
        profile: { legalName: 'Agency B LLP', displayName: 'Agency B', operatingZones: ['Kochi'] },
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.body.organization.publicId}/agency-profile`)
      .set('Cookie', b.cookie)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.body.organization.publicId}/members`)
      .set('Cookie', b.cookie)
      .send({ userPublicId: b.publicId, role: 'AGENT_STAFF' })
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgB.body.organization.publicId}`)
      .set('Cookie', a.cookie)
      .expect(404);
  });

  it('invites staff, restricts staff manage actions, and deactivation removes access', async () => {
    const owner = await register(app, 'team-owner@example.com');
    const staff = await register(app, 'team-staff@example.com');

    const onboard = await request(app.getHttpServer())
      .post('/api/v1/organizations/onboard')
      .set('Cookie', owner.cookie)
      .send({
        type: 'DEVELOPER',
        name: 'Team Co',
        profile: {
          legalName: 'Team Co Pvt Ltd',
          displayName: 'Team Co',
          operatingZones: ['Delhi'],
        },
      })
      .expect(201);
    const orgId = onboard.body.organization.publicId as string;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgId}/members`)
      .set('Cookie', owner.cookie)
      .send({ userPublicId: staff.publicId, role: 'DEVELOPER_STAFF' })
      .expect(201);

    const members = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/members`)
      .set('Cookie', staff.cookie)
      .expect(200);
    expect(members.body.members).toHaveLength(2);

    await request(app.getHttpServer())
      .put(`/api/v1/organizations/${orgId}/developer-profile`)
      .set('Cookie', staff.cookie)
      .send({ description: 'Staff cannot manage' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${orgId}/members/${staff.publicId}`)
      .set('Cookie', owner.cookie)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}`)
      .set('Cookie', staff.cookie)
      .expect(404);
  });

  it('exposes public profiles without private contact fields or internal UUIDs', async () => {
    const owner = await register(app, 'public-dev@example.com');
    const onboard = await request(app.getHttpServer())
      .post('/api/v1/organizations/onboard')
      .set('Cookie', owner.cookie)
      .send({
        type: 'DEVELOPER',
        name: 'Public Dev',
        profile: {
          legalName: 'Public Dev Pvt Ltd',
          displayName: 'Public Dev',
          description: 'Public facing story',
          contactEmail: 'private@example.com',
          contactPhone: '+91-9000000099',
          operatingZones: ['Jaipur'],
        },
      })
      .expect(201);

    const profilePublicId = onboard.body.developerProfile.publicId as string;
    const publicProfile = await request(app.getHttpServer())
      .get(`/api/v1/developers/${profilePublicId}`)
      .expect(200);

    expect(publicProfile.body.displayName).toBe('Public Dev');
    expect(publicProfile.body.description).toBe('Public facing story');
    expect(publicProfile.body.contactEmail).toBeUndefined();
    expect(publicProfile.body.contactPhone).toBeUndefined();
    expect(publicProfile.body.legalName).toBeUndefined();
    expect(JSON.stringify(publicProfile.body)).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );

    await request(app.getHttpServer()).get('/api/v1/developers/PS-DEV-999999').expect(404);
  });

  it('rejects invalid role assignments for organization type', async () => {
    const owner = await register(app, 'role-owner@example.com');
    const invitee = await register(app, 'role-invitee@example.com');
    const onboard = await request(app.getHttpServer())
      .post('/api/v1/organizations/onboard')
      .set('Cookie', owner.cookie)
      .send({
        type: 'AGENCY',
        name: 'Role Agency',
        profile: {
          legalName: 'Role Agency LLP',
          displayName: 'Role Agency',
          operatingZones: ['Goa'],
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${onboard.body.organization.publicId}/members`)
      .set('Cookie', owner.cookie)
      .send({ userPublicId: invitee.publicId, role: 'DEVELOPER_STAFF' })
      .expect(422);
  });
});
