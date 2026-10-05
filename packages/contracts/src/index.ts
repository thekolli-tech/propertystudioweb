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
