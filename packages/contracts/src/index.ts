import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export const healthStatusSchema = z.enum(['ok', 'degraded', 'error']);

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('property-studio-api'),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const dependencyCheckSchema = z.object({
  name: z.string().min(1),
  status: healthStatusSchema,
  latencyMs: z.number().nonnegative().optional(),
  message: z.string().optional(),
});

export const readyResponseSchema = z.object({
  status: healthStatusSchema,
  service: z.literal('property-studio-api'),
  timestamp: z.string().datetime(),
  checks: z.array(dependencyCheckSchema),
});

export type ReadyResponse = z.infer<typeof readyResponseSchema>;

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;

export const platformRoleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'PROPERTY_ADMIN',
  'CONTENT_EDITOR',
  'MODERATOR',
]);

export const organizationRoleSchema = z.enum([
  'DEVELOPER',
  'DEVELOPER_STAFF',
  'AGENT',
  'AGENT_STAFF',
]);

export const organizationTypeSchema = z.enum(['DEVELOPER', 'AGENCY']);

export const personaSchema = z.enum([
  'PROPERTY_SEEKER',
  'INVESTOR',
  'PROPERTY_OWNER',
  'LAND_OWNER',
  'BUILDER',
  'LEGAL_VERIFIER',
  'VALUATION_EXPERT',
]);

export const accountStatusSchema = z.enum(['ACTIVE', 'DISABLED', 'PENDING_VERIFICATION']);

export const registerRequestSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(10).max(128),
  personas: z.array(personaSchema).max(7).default([]),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(128),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10).max(128),
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

export const createOrganizationRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: organizationTypeSchema,
});

export type CreateOrganizationRequest = z.infer<typeof createOrganizationRequestSchema>;

export const addOrganizationMemberRequestSchema = z.object({
  userPublicId: z.string().regex(/^PS-USER-\d+$/),
  role: organizationRoleSchema,
});

export type AddOrganizationMemberRequest = z.infer<typeof addOrganizationMemberRequestSchema>;

export const setPersonasRequestSchema = z.object({
  personas: z.array(personaSchema).max(7),
});

export type SetPersonasRequest = z.infer<typeof setPersonasRequestSchema>;

export const grantPlatformRoleRequestSchema = z.object({
  role: platformRoleSchema,
});

export type GrantPlatformRoleRequest = z.infer<typeof grantPlatformRoleRequestSchema>;

export const userSummarySchema = z.object({
  publicId: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  status: accountStatusSchema,
  platformRoles: z.array(platformRoleSchema),
  personas: z.array(personaSchema),
  activeOrganizationPublicId: z.string().nullable(),
});

export type UserSummary = z.infer<typeof userSummarySchema>;

export const organizationSummarySchema = z.object({
  publicId: z.string(),
  name: z.string(),
  type: organizationTypeSchema,
  status: z.enum(['ACTIVE', 'DISABLED']),
  role: organizationRoleSchema.optional(),
});

export type OrganizationSummary = z.infer<typeof organizationSummarySchema>;

export const authSuccessResponseSchema = z.object({
  user: userSummarySchema,
});

export type AuthSuccessResponse = z.infer<typeof authSuccessResponseSchema>;

export const organizationListResponseSchema = z.object({
  organizations: z.array(organizationSummarySchema),
});

export type OrganizationListResponse = z.infer<typeof organizationListResponseSchema>;

export const organizationMemberSchema = z.object({
  userPublicId: z.string(),
  email: z.string(),
  role: organizationRoleSchema,
  status: z.enum(['ACTIVE', 'DISABLED']),
});

export const organizationMembersResponseSchema = z.object({
  members: z.array(organizationMemberSchema),
});

export type OrganizationMembersResponse = z.infer<typeof organizationMembersResponseSchema>;

export const okResponseSchema = z.object({
  ok: z.literal(true),
});

export type OkResponse = z.infer<typeof okResponseSchema>;

export const switchOrganizationResponseSchema = z.object({
  activeOrganizationPublicId: z.string().min(1),
});

export type SwitchOrganizationResponse = z.infer<typeof switchOrganizationResponseSchema>;

export const profileStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export const agencyVerificationStatusSchema = z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED']);

const operatingZonesSchema = z.array(z.string().trim().min(1).max(80)).max(20).default([]);

const optionalUrlSchema = z
  .union([z.literal(''), z.url().max(320)])
  .optional()
  .nullable();

const optionalEmailSchema = z
  .union([z.literal(''), z.email().max(320)])
  .optional()
  .nullable();

export const developerProfileFieldsSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  displayName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  website: optionalUrlSchema,
  contactEmail: optionalEmailSchema,
  contactPhone: z.string().trim().max(32).optional().nullable(),
  headquartersCity: z.string().trim().max(80).optional().nullable(),
  headquartersState: z.string().trim().max(80).optional().nullable(),
  operatingZones: operatingZonesSchema,
});

export const updateDeveloperProfileRequestSchema = developerProfileFieldsSchema.partial().extend({
  logoObjectKey: z.string().trim().max(512).optional().nullable(),
});

export type UpdateDeveloperProfileRequest = z.infer<typeof updateDeveloperProfileRequestSchema>;

export const agencyProfileFieldsSchema = developerProfileFieldsSchema.extend({
  specialization: z.string().trim().max(160).optional().nullable(),
});

export const updateAgencyProfileRequestSchema = agencyProfileFieldsSchema.partial().extend({
  logoObjectKey: z.string().trim().max(512).optional().nullable(),
});

export type UpdateAgencyProfileRequest = z.infer<typeof updateAgencyProfileRequestSchema>;

export const onboardOrganizationRequestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('DEVELOPER'),
    name: z.string().trim().min(2).max(120),
    profile: developerProfileFieldsSchema,
  }),
  z.object({
    type: z.literal('AGENCY'),
    name: z.string().trim().min(2).max(120),
    profile: agencyProfileFieldsSchema,
  }),
]);

export type OnboardOrganizationRequest = z.infer<typeof onboardOrganizationRequestSchema>;

export const updateOrganizationRequestSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
});

export type UpdateOrganizationRequest = z.infer<typeof updateOrganizationRequestSchema>;

export const updateOrganizationMemberRequestSchema = z
  .object({
    role: organizationRoleSchema.optional(),
    status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: 'At least one of role or status is required.',
  });

export type UpdateOrganizationMemberRequest = z.infer<typeof updateOrganizationMemberRequestSchema>;

export const developerProfileSchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  legalName: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  logoObjectKey: z.string().nullable(),
  website: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  headquartersCity: z.string().nullable(),
  headquartersState: z.string().nullable(),
  operatingZones: z.array(z.string()),
  status: profileStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type DeveloperProfile = z.infer<typeof developerProfileSchema>;

export const agencyProfileSchema = developerProfileSchema.extend({
  specialization: z.string().nullable(),
  verificationStatus: agencyVerificationStatusSchema,
});

export type AgencyProfile = z.infer<typeof agencyProfileSchema>;

export const publicDeveloperProfileSchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  website: z.string().nullable(),
  headquartersCity: z.string().nullable(),
  headquartersState: z.string().nullable(),
  operatingZones: z.array(z.string()),
});

export type PublicDeveloperProfile = z.infer<typeof publicDeveloperProfileSchema>;

export const publicAgencyProfileSchema = publicDeveloperProfileSchema.extend({
  specialization: z.string().nullable(),
  verificationStatus: agencyVerificationStatusSchema,
});

export type PublicAgencyProfile = z.infer<typeof publicAgencyProfileSchema>;

export const organizationDetailSchema = organizationSummarySchema.extend({
  profilePublicId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OrganizationDetail = z.infer<typeof organizationDetailSchema>;

export const onboardOrganizationResponseSchema = z.object({
  organization: organizationDetailSchema,
  developerProfile: developerProfileSchema.optional(),
  agencyProfile: agencyProfileSchema.optional(),
});

export type OnboardOrganizationResponse = z.infer<typeof onboardOrganizationResponseSchema>;
