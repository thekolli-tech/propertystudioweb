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

// --- Phase 5: catalog foundation ---

export const projectTypeSchema = z.enum([
  'RESIDENTIAL',
  'COMMERCIAL',
  'MIXED_USE',
  'PLOTTED',
  'OTHER',
]);

export const projectLifecycleStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const propertyTypeSchema = z.enum([
  'APARTMENT',
  'VILLA',
  'PLOT',
  'OFFICE',
  'SHOP',
  'WAREHOUSE',
  'OTHER',
]);

export const listingTypeSchema = z.enum(['SALE', 'RENT']);

export const propertyConfigurationSchema = z.enum([
  'STUDIO',
  'ONE_BHK',
  'TWO_BHK',
  'THREE_BHK',
  'FOUR_BHK',
  'FIVE_BHK_PLUS',
  'OTHER',
]);

export const propertyPublicationStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

export const propertyAvailabilityStatusSchema = z.enum([
  'AVAILABLE',
  'UNDER_OFFER',
  'SOLD',
  'UNAVAILABLE',
]);

export const communityStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export const communityVisibilitySchema = z.enum(['PRIVATE', 'PUBLIC']);
export const catalogEntityTypeSchema = z.enum(['PROJECT', 'PROPERTY', 'COMMUNITY']);
export const mediaTypeSchema = z.enum(['IMAGE', 'VIDEO', 'FLOOR_PLAN', 'OTHER']);
export const assetVisibilitySchema = z.enum(['PRIVATE', 'PUBLIC']);

export const cursorPageMetaSchema = z.object({
  nextCursor: z.string().nullable(),
});

const moneyInputSchema = z.union([z.string(), z.number(), z.bigint()]).transform((value) => {
  const parsed = typeof value === 'bigint' ? value : BigInt(value);
  return parsed;
});

const moneyMinorSchema = moneyInputSchema.refine((value) => value >= 0n, {
  message: 'Money amount must be non-negative minor units.',
});

const optionalMoneyMinorSchema = z
  .union([moneyInputSchema, z.null()])
  .optional()
  .refine((value) => value === undefined || value === null || value >= 0n, {
    message: 'Money amount must be non-negative minor units.',
  });

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case.');

export const createProjectRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  name: z.string().trim().min(2).max(160),
  slug: slugSchema.optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  projectType: projectTypeSchema,
  addressLine1: z.string().trim().max(200).optional().nullable(),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  locality: z.string().trim().max(120).optional().nullable(),
  microMarket: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  countryCode: z.string().trim().length(2).default('IN'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  totalAreaSqft: z.number().nonnegative().optional().nullable(),
  totalUnits: z.number().int().nonnegative().optional().nullable(),
  startingPriceMinor: optionalMoneyMinorSchema,
  currency: z.string().trim().length(3).default('INR'),
  possessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

export const updateProjectRequestSchema = createProjectRequestSchema
  .omit({ organizationPublicId: true })
  .partial()
  .extend({
    lifecycleStatus: projectLifecycleStatusSchema.optional(),
    expectedVersion: z.number().int().positive().optional(),
  });

export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

export const projectListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(120).optional(),
  microMarket: z.string().trim().max(120).optional(),
  projectType: projectTypeSchema.optional(),
  lifecycleStatus: projectLifecycleStatusSchema.optional(),
});

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export const mediaAssetSummarySchema = z.object({
  publicId: z.string(),
  mediaType: mediaTypeSchema,
  mimeType: z.string(),
  sortOrder: z.number().int(),
  altText: z.string().nullable(),
  visibility: assetVisibilitySchema,
});

export const documentAssetSummarySchema = z.object({
  publicId: z.string(),
  documentType: z.string(),
  title: z.string(),
  mimeType: z.string(),
  visibility: assetVisibilitySchema,
});

export const projectSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  name: z.string(),
  slug: z.string(),
  projectType: projectTypeSchema,
  lifecycleStatus: projectLifecycleStatusSchema,
  city: z.string().nullable(),
  locality: z.string().nullable(),
  microMarket: z.string().nullable(),
  startingPriceMinor: z.string().nullable(),
  currency: z.string(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectDetailSchema = projectSummarySchema.extend({
  description: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  countryCode: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  totalAreaSqft: z.number().nullable(),
  totalUnits: z.number().nullable(),
  possessionDate: z.string().nullable(),
  version: z.number().int(),
  propertyCount: z.number().int().nonnegative(),
  media: z.array(mediaAssetSummarySchema).default([]),
  documents: z.array(documentAssetSummarySchema).default([]),
});

export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export const projectListResponseSchema = z.object({
  projects: z.array(projectSummarySchema),
  nextCursor: z.string().nullable(),
});

export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;

export const createPropertyRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional()
    .nullable(),
  title: z.string().trim().min(2).max(200),
  propertyType: propertyTypeSchema,
  listingType: listingTypeSchema.default('SALE'),
  configuration: propertyConfigurationSchema.optional().nullable(),
  bedrooms: z.number().int().min(0).max(50).optional().nullable(),
  bathrooms: z.number().int().min(0).max(50).optional().nullable(),
  carpetAreaSqft: z.number().nonnegative().optional().nullable(),
  builtUpAreaSqft: z.number().nonnegative().optional().nullable(),
  plotAreaSqft: z.number().nonnegative().optional().nullable(),
  floorNumber: z.number().int().optional().nullable(),
  totalFloors: z.number().int().nonnegative().optional().nullable(),
  facing: z.string().trim().max(40).optional().nullable(),
  priceMinor: moneyMinorSchema,
  currency: z.string().trim().length(3).default('INR'),
  availabilityStatus: propertyAvailabilityStatusSchema.default('AVAILABLE'),
  description: z.string().trim().max(5000).optional().nullable(),
  addressLine1: z.string().trim().max(200).optional().nullable(),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  locality: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  countryCode: z.string().trim().length(2).default('IN'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export type CreatePropertyRequest = z.infer<typeof createPropertyRequestSchema>;

export const updatePropertyRequestSchema = createPropertyRequestSchema
  .omit({ organizationPublicId: true })
  .partial()
  .extend({
    publicationStatus: propertyPublicationStatusSchema.optional(),
    expectedVersion: z.number().int().positive().optional(),
  });

export type UpdatePropertyRequest = z.infer<typeof updatePropertyRequestSchema>;

export const propertyListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional(),
  city: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(120).optional(),
  propertyType: propertyTypeSchema.optional(),
  configuration: propertyConfigurationSchema.optional(),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  minPriceMinor: z.coerce.bigint().optional(),
  maxPriceMinor: z.coerce.bigint().optional(),
  availabilityStatus: propertyAvailabilityStatusSchema.optional(),
  publicationStatus: propertyPublicationStatusSchema.optional(),
});

export type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;

export const propertySummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  projectPublicId: z.string().nullable(),
  title: z.string(),
  propertyType: propertyTypeSchema,
  listingType: listingTypeSchema,
  configuration: propertyConfigurationSchema.nullable(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  priceMinor: z.string(),
  currency: z.string(),
  availabilityStatus: propertyAvailabilityStatusSchema,
  publicationStatus: propertyPublicationStatusSchema,
  city: z.string().nullable(),
  locality: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PropertySummary = z.infer<typeof propertySummarySchema>;

export const propertyDetailSchema = propertySummarySchema.extend({
  description: z.string().nullable(),
  carpetAreaSqft: z.number().nullable(),
  builtUpAreaSqft: z.number().nullable(),
  plotAreaSqft: z.number().nullable(),
  floorNumber: z.number().nullable(),
  totalFloors: z.number().nullable(),
  facing: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  countryCode: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  version: z.number().int(),
  media: z.array(mediaAssetSummarySchema).default([]),
  documents: z.array(documentAssetSummarySchema).default([]),
});

export type PropertyDetail = z.infer<typeof propertyDetailSchema>;

export const propertyListResponseSchema = z.object({
  properties: z.array(propertySummarySchema),
  nextCursor: z.string().nullable(),
});

export type PropertyListResponse = z.infer<typeof propertyListResponseSchema>;

export const createCommunityRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional()
    .nullable(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  visibility: communityVisibilitySchema.default('PRIVATE'),
});

export type CreateCommunityRequest = z.infer<typeof createCommunityRequestSchema>;

export const updateCommunityRequestSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  status: communityStatusSchema.optional(),
  visibility: communityVisibilitySchema.optional(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional()
    .nullable(),
  expectedVersion: z.number().int().positive().optional(),
});

export type UpdateCommunityRequest = z.infer<typeof updateCommunityRequestSchema>;

export const communityListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional(),
});

export type CommunityListQuery = z.infer<typeof communityListQuerySchema>;

export const communitySummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  projectPublicId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  status: communityStatusSchema,
  visibility: communityVisibilitySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int(),
});

export type CommunitySummary = z.infer<typeof communitySummarySchema>;

export const communityListResponseSchema = z.object({
  communities: z.array(communitySummarySchema),
  nextCursor: z.string().nullable(),
});

export type CommunityListResponse = z.infer<typeof communityListResponseSchema>;

export const createMediaAssetRequestSchema = z.object({
  entityType: z.enum(['PROJECT', 'PROPERTY']),
  entityPublicId: z.string().regex(/^PS-(PROJ|PROP)-\d+$/),
  storageKey: z.string().trim().min(1).max(512),
  mimeType: z.string().trim().min(3).max(120),
  mediaType: mediaTypeSchema,
  fileSizeBytes: moneyMinorSchema,
  sortOrder: z.number().int().min(0).default(0),
  altText: z.string().trim().max(240).optional().nullable(),
  visibility: assetVisibilitySchema.default('PRIVATE'),
});

export type CreateMediaAssetRequest = z.infer<typeof createMediaAssetRequestSchema>;

export const createDocumentAssetRequestSchema = z.object({
  entityType: z.enum(['PROJECT', 'PROPERTY']),
  entityPublicId: z.string().regex(/^PS-(PROJ|PROP)-\d+$/),
  storageKey: z.string().trim().min(1).max(512),
  mimeType: z.string().trim().min(3).max(120),
  documentType: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(200),
  fileSizeBytes: moneyMinorSchema,
  visibility: assetVisibilitySchema.default('PRIVATE'),
});

export type CreateDocumentAssetRequest = z.infer<typeof createDocumentAssetRequestSchema>;

export const publicProjectSummarySchema = z.object({
  publicId: z.string(),
  developerPublicId: z.string().nullable(),
  developerDisplayName: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  projectType: projectTypeSchema,
  city: z.string().nullable(),
  locality: z.string().nullable(),
  microMarket: z.string().nullable(),
  startingPriceMinor: z.string().nullable(),
  currency: z.string(),
  publishedAt: z.string().datetime().nullable(),
});

export type PublicProjectSummary = z.infer<typeof publicProjectSummarySchema>;

export const publicProjectDetailSchema = publicProjectSummarySchema.extend({
  description: z.string().nullable(),
  state: z.string().nullable(),
  countryCode: z.string(),
  totalAreaSqft: z.number().nullable(),
  totalUnits: z.number().nullable(),
  possessionDate: z.string().nullable(),
  propertyCount: z.number().int().nonnegative(),
  media: z.array(mediaAssetSummarySchema).default([]),
  documents: z.array(documentAssetSummarySchema).default([]),
});

export type PublicProjectDetail = z.infer<typeof publicProjectDetailSchema>;

export const publicProjectListQuerySchema = cursorPaginationQuerySchema.extend({
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(120).optional(),
  microMarket: z.string().trim().max(120).optional(),
  projectType: projectTypeSchema.optional(),
});

export type PublicProjectListQuery = z.infer<typeof publicProjectListQuerySchema>;

export const publicProjectListResponseSchema = z.object({
  projects: z.array(publicProjectSummarySchema),
  nextCursor: z.string().nullable(),
});

export type PublicProjectListResponse = z.infer<typeof publicProjectListResponseSchema>;

export const publicPropertySummarySchema = z.object({
  publicId: z.string(),
  projectPublicId: z.string().nullable(),
  developerPublicId: z.string().nullable(),
  developerDisplayName: z.string().nullable(),
  title: z.string(),
  propertyType: propertyTypeSchema,
  listingType: listingTypeSchema,
  configuration: propertyConfigurationSchema.nullable(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  priceMinor: z.string(),
  currency: z.string(),
  availabilityStatus: propertyAvailabilityStatusSchema,
  city: z.string().nullable(),
  locality: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
});

export type PublicPropertySummary = z.infer<typeof publicPropertySummarySchema>;

export const publicPropertyDetailSchema = publicPropertySummarySchema.extend({
  description: z.string().nullable(),
  carpetAreaSqft: z.number().nullable(),
  builtUpAreaSqft: z.number().nullable(),
  plotAreaSqft: z.number().nullable(),
  floorNumber: z.number().nullable(),
  totalFloors: z.number().nullable(),
  facing: z.string().nullable(),
  state: z.string().nullable(),
  countryCode: z.string(),
  media: z.array(mediaAssetSummarySchema).default([]),
  documents: z.array(documentAssetSummarySchema).default([]),
});

export type PublicPropertyDetail = z.infer<typeof publicPropertyDetailSchema>;

export const publicPropertyListQuerySchema = cursorPaginationQuerySchema.extend({
  city: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(120).optional(),
  propertyType: propertyTypeSchema.optional(),
  configuration: propertyConfigurationSchema.optional(),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  minPriceMinor: z.coerce.bigint().optional(),
  maxPriceMinor: z.coerce.bigint().optional(),
  availabilityStatus: propertyAvailabilityStatusSchema.optional(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional(),
});

export type PublicPropertyListQuery = z.infer<typeof publicPropertyListQuerySchema>;

export const publicPropertyListResponseSchema = z.object({
  properties: z.array(publicPropertySummarySchema),
  nextCursor: z.string().nullable(),
});

export type PublicPropertyListResponse = z.infer<typeof publicPropertyListResponseSchema>;

export const assignResourceRequestSchema = z.object({
  userPublicId: z.string().regex(/^PS-USER-\d+$/),
  resourceType: z.enum(['PROPERTY', 'PROJECT']),
  resourcePublicId: z.string().regex(/^PS-(PROP|PROJ)-\d+$/),
});

export type AssignResourceRequest = z.infer<typeof assignResourceRequestSchema>;

// ---------------------------------------------------------------------------
// Phase 7 — Requirements + Leads (demand marketplace)
// ---------------------------------------------------------------------------

export const requirementTransactionTypeSchema = z.enum(['BUY', 'RENT']);
export const requirementStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'FULFILLED',
  'CLOSED',
  'CANCELLED',
]);
export const requirementVisibilitySchema = z.enum(['PRIVATE', 'MARKETPLACE']);
export const requirementPurposeSchema = z.enum(['END_USE', 'INVESTMENT', 'BOTH']);
export const requirementTimelineSchema = z.enum([
  'IMMEDIATE',
  'WITHIN_3_MONTHS',
  'WITHIN_6_MONTHS',
  'WITHIN_1_YEAR',
  'FLEXIBLE',
]);
export const leadStatusSchema = z.enum([
  'NEW',
  'ASSIGNED',
  'VIEWED',
  'CONTACTED',
  'QUALIFIED',
  'SITE_VISIT',
  'NEGOTIATION',
  'BOOKED',
  'CLOSED',
  'LOST',
]);
export type LeadStatus = z.infer<typeof leadStatusSchema>;
export const leadSourceSchema = z.enum(['REQUIREMENT_MARKETPLACE']);
export const leadPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH']);
export type LeadPriority = z.infer<typeof leadPrioritySchema>;

const requirementRequestFieldsSchema = z.object({
  propertyType: propertyTypeSchema,
  transactionType: requirementTransactionTypeSchema,
  configuration: propertyConfigurationSchema.optional().nullable(),
  bedrooms: z.number().int().min(0).max(50).optional().nullable(),
  budgetMinMinor: optionalMoneyMinorSchema,
  budgetMaxMinor: optionalMoneyMinorSchema,
  currency: z.string().trim().length(3).default('INR'),
  city: z.string().trim().min(2).max(80),
  locality: z.string().trim().max(120).optional().nullable(),
  microMarket: z.string().trim().max(120).optional().nullable(),
  preferredProject: z.string().trim().max(160).optional().nullable(),
  purpose: requirementPurposeSchema.default('END_USE'),
  timeline: requirementTimelineSchema.default('FLEXIBLE'),
  vaastuRequired: z.boolean().default(false),
  amenities: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  notes: z.string().trim().max(2000).optional().nullable(),
  visibility: requirementVisibilitySchema.default('PRIVATE'),
});

function refineRequirementBudget<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const record = value as {
      budgetMinMinor?: bigint | null;
      budgetMaxMinor?: bigint | null;
    };
    if (
      record.budgetMinMinor !== undefined &&
      record.budgetMinMinor !== null &&
      record.budgetMaxMinor !== undefined &&
      record.budgetMaxMinor !== null &&
      record.budgetMinMinor > record.budgetMaxMinor
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'budgetMinMinor must be less than or equal to budgetMaxMinor.',
        path: ['budgetMinMinor'],
      });
    }
  });
}

export const createRequirementRequestSchema = refineRequirementBudget(
  requirementRequestFieldsSchema,
);

export type CreateRequirementRequest = z.infer<typeof createRequirementRequestSchema>;

export const updateRequirementRequestSchema = refineRequirementBudget(
  requirementRequestFieldsSchema.partial().extend({
    expectedVersion: z.number().int().positive().optional(),
  }),
);

export type UpdateRequirementRequest = z.infer<typeof updateRequirementRequestSchema>;

export const requirementListQuerySchema = cursorPaginationQuerySchema.extend({
  status: requirementStatusSchema.optional(),
  visibility: requirementVisibilitySchema.optional(),
  transactionType: requirementTransactionTypeSchema.optional(),
  propertyType: propertyTypeSchema.optional(),
  city: z.string().trim().max(80).optional(),
});

export type RequirementListQuery = z.infer<typeof requirementListQuerySchema>;

export const adminRequirementListQuerySchema = requirementListQuerySchema.extend({
  ownerUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .optional(),
});

export type AdminRequirementListQuery = z.infer<typeof adminRequirementListQuerySchema>;

export const requirementSummarySchema = z.object({
  publicId: z.string(),
  propertyType: propertyTypeSchema,
  transactionType: requirementTransactionTypeSchema,
  configuration: propertyConfigurationSchema.nullable(),
  bedrooms: z.number().nullable(),
  budgetMinMinor: z.string().nullable(),
  budgetMaxMinor: z.string().nullable(),
  currency: z.string(),
  city: z.string(),
  locality: z.string().nullable(),
  microMarket: z.string().nullable(),
  preferredProject: z.string().nullable(),
  purpose: requirementPurposeSchema,
  timeline: requirementTimelineSchema,
  vaastuRequired: z.boolean(),
  amenities: z.array(z.string()),
  status: requirementStatusSchema,
  visibility: requirementVisibilitySchema,
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RequirementSummary = z.infer<typeof requirementSummarySchema>;

export const requirementDetailSchema = requirementSummarySchema.extend({
  notes: z.string().nullable(),
  ownerUserPublicId: z.string(),
});

export type RequirementDetail = z.infer<typeof requirementDetailSchema>;

export const requirementListResponseSchema = z.object({
  requirements: z.array(requirementSummarySchema),
  nextCursor: z.string().nullable(),
});

export type RequirementListResponse = z.infer<typeof requirementListResponseSchema>;

export const adminRequirementSummarySchema = requirementSummarySchema.extend({
  ownerUserPublicId: z.string(),
});

export type AdminRequirementSummary = z.infer<typeof adminRequirementSummarySchema>;

export const adminRequirementListResponseSchema = z.object({
  requirements: z.array(adminRequirementSummarySchema),
  nextCursor: z.string().nullable(),
});

export type AdminRequirementListResponse = z.infer<typeof adminRequirementListResponseSchema>;

/** Anonymized marketplace projection — never includes PII or private notes. */
export const publicRequirementSummarySchema = z.object({
  publicId: z.string(),
  intentLabel: z.string(),
  headline: z.string(),
  propertyType: propertyTypeSchema,
  transactionType: requirementTransactionTypeSchema,
  configuration: propertyConfigurationSchema.nullable(),
  bedrooms: z.number().nullable(),
  budgetMinMinor: z.string().nullable(),
  budgetMaxMinor: z.string().nullable(),
  currency: z.string(),
  city: z.string(),
  locality: z.string().nullable(),
  microMarket: z.string().nullable(),
  purpose: requirementPurposeSchema,
  timeline: requirementTimelineSchema,
  vaastuRequired: z.boolean(),
  amenities: z.array(z.string()),
  highIntent: z.boolean(),
  createdAt: z.string().datetime(),
});

export type PublicRequirementSummary = z.infer<typeof publicRequirementSummarySchema>;

export const publicRequirementDetailSchema = publicRequirementSummarySchema.extend({
  preferredProject: z.string().nullable(),
});

export type PublicRequirementDetail = z.infer<typeof publicRequirementDetailSchema>;

export const publicRequirementListQuerySchema = cursorPaginationQuerySchema.extend({
  propertyType: propertyTypeSchema.optional(),
  transactionType: requirementTransactionTypeSchema.optional(),
  configuration: propertyConfigurationSchema.optional(),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  city: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(120).optional(),
  microMarket: z.string().trim().max(120).optional(),
  minBudgetMinor: z.coerce.bigint().optional(),
  maxBudgetMinor: z.coerce.bigint().optional(),
  timeline: requirementTimelineSchema.optional(),
});

export type PublicRequirementListQuery = z.infer<typeof publicRequirementListQuerySchema>;

export const publicRequirementListResponseSchema = z.object({
  requirements: z.array(publicRequirementSummarySchema),
  nextCursor: z.string().nullable(),
});

export type PublicRequirementListResponse = z.infer<typeof publicRequirementListResponseSchema>;

export const matchCriteriaSchema = z.object({
  key: z.string(),
  label: z.string(),
  weight: z.number().int().nonnegative(),
});

export const matchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  matched: z.array(matchCriteriaSchema),
  unmatched: z.array(matchCriteriaSchema),
  explanation: z.string(),
});

export type MatchResult = z.infer<typeof matchResultSchema>;

export const createMarketplaceLeadRequestSchema = z.object({
  requirementPublicId: z.string().regex(/^PS-REQ-\d+$/),
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  matchedPropertyPublicId: z
    .string()
    .regex(/^PS-PROP-\d+$/)
    .optional()
    .nullable(),
  matchedProjectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional()
    .nullable(),
});

export type CreateMarketplaceLeadRequest = z.infer<typeof createMarketplaceLeadRequestSchema>;

export const updateLeadStatusRequestSchema = z.object({
  status: leadStatusSchema,
  expectedVersion: z.number().int().positive().optional(),
});

export type UpdateLeadStatusRequest = z.infer<typeof updateLeadStatusRequestSchema>;

export const leadListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
  status: leadStatusSchema.optional(),
  requirementPublicId: z
    .string()
    .regex(/^PS-REQ-\d+$/)
    .optional(),
});

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

export const adminLeadListQuerySchema = leadListQuerySchema;

export type AdminLeadListQuery = z.infer<typeof adminLeadListQuerySchema>;

export const leadSummarySchema = z.object({
  publicId: z.string(),
  requirementPublicId: z.string(),
  recipientOrganizationPublicId: z.string(),
  recipientUserPublicId: z.string().nullable(),
  matchedPropertyPublicId: z.string().nullable(),
  matchedProjectPublicId: z.string().nullable(),
  matchScore: z.number().int(),
  matchedCriteria: z.array(matchCriteriaSchema),
  unmatchedCriteria: z.array(matchCriteriaSchema),
  matchExplanation: z.string(),
  source: leadSourceSchema,
  status: leadStatusSchema,
  priority: leadPrioritySchema,
  requirement: publicRequirementSummarySchema,
  assignedAt: z.string().datetime().nullable(),
  firstViewedAt: z.string().datetime().nullable(),
  contactedAt: z.string().datetime().nullable(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LeadSummary = z.infer<typeof leadSummarySchema>;

export const leadListResponseSchema = z.object({
  leads: z.array(leadSummarySchema),
  nextCursor: z.string().nullable(),
});

export type LeadListResponse = z.infer<typeof leadListResponseSchema>;

export const adminLeadSummarySchema = leadSummarySchema;

export type AdminLeadSummary = z.infer<typeof adminLeadSummarySchema>;

export const adminLeadListResponseSchema = leadListResponseSchema;

export type AdminLeadListResponse = z.infer<typeof adminLeadListResponseSchema>;

// ---------------------------------------------------------------------------
// Phase 8 — CRM + lead operations
// ---------------------------------------------------------------------------

export const contactTypeSchema = z.enum(['BUYER', 'INVESTOR', 'REFERRAL', 'OTHER']);
export const contactStatusSchema = z.enum(['ACTIVE', 'ARCHIVED']);
export const preferredContactMethodSchema = z.enum([
  'PHONE',
  'EMAIL',
  'WHATSAPP',
  'IN_PERSON',
  'OTHER',
]);
export const crmActivityTypeSchema = z.enum([
  'NOTE',
  'CALL',
  'EMAIL',
  'WHATSAPP',
  'MEETING',
  'SITE_VISIT',
  'STATUS_CHANGE',
  'ASSIGNMENT',
  'FOLLOW_UP',
]);
export const followUpStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const followUpPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const siteVisitStatusSchema = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);
export const siteVisitOutcomeSchema = z.enum([
  'INTERESTED',
  'FOLLOW_UP',
  'NEGOTIATION',
  'NOT_INTERESTED',
  'UNKNOWN',
]);
export const dealStatusSchema = z.enum(['OPEN', 'NEGOTIATION', 'BOOKED', 'CLOSED', 'LOST']);

export const createCrmContactRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  sourceLeadPublicId: z
    .string()
    .regex(/^PS-LEAD-\d+$/)
    .optional()
    .nullable(),
  contactType: contactTypeSchema.default('BUYER'),
  displayName: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(32).optional().nullable(),
  email: z.email().max(320).optional().nullable(),
  preferredContactMethod: preferredContactMethodSchema.default('PHONE'),
  notes: z.string().trim().max(2000).optional().nullable(),
  ownerUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .optional()
    .nullable(),
});

export type CreateCrmContactRequest = z.infer<typeof createCrmContactRequestSchema>;

export const updateCrmContactRequestSchema = createCrmContactRequestSchema
  .omit({ organizationPublicId: true })
  .partial()
  .extend({
    status: contactStatusSchema.optional(),
    expectedVersion: z.number().int().positive().optional(),
  });

export type UpdateCrmContactRequest = z.infer<typeof updateCrmContactRequestSchema>;

export const crmContactListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  status: contactStatusSchema.optional(),
  q: z.string().trim().max(120).optional(),
  ownerUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .optional(),
  sourceLeadPublicId: z
    .string()
    .regex(/^PS-LEAD-\d+$/)
    .optional(),
});

export type CrmContactListQuery = z.infer<typeof crmContactListQuerySchema>;

export const crmContactSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  sourceLeadPublicId: z.string().nullable(),
  contactType: contactTypeSchema,
  displayName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  preferredContactMethod: preferredContactMethodSchema,
  notes: z.string().nullable(),
  ownerUserPublicId: z.string().nullable(),
  status: contactStatusSchema,
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CrmContactSummary = z.infer<typeof crmContactSummarySchema>;

export const crmContactListResponseSchema = z.object({
  contacts: z.array(crmContactSummarySchema),
  nextCursor: z.string().nullable(),
});

export type CrmContactListResponse = z.infer<typeof crmContactListResponseSchema>;

export const createCrmActivityRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  contactPublicId: z
    .string()
    .regex(/^PS-CONTACT-\d+$/)
    .optional()
    .nullable(),
  leadPublicId: z
    .string()
    .regex(/^PS-LEAD-\d+$/)
    .optional()
    .nullable(),
  activityType: crmActivityTypeSchema,
  subject: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

export type CreateCrmActivityRequest = z.infer<typeof createCrmActivityRequestSchema>;

export const crmActivityListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  contactPublicId: z
    .string()
    .regex(/^PS-CONTACT-\d+$/)
    .optional(),
  leadPublicId: z
    .string()
    .regex(/^PS-LEAD-\d+$/)
    .optional(),
  activityType: crmActivityTypeSchema.optional(),
});

export type CrmActivityListQuery = z.infer<typeof crmActivityListQuerySchema>;

export const crmActivitySummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  contactPublicId: z.string().nullable(),
  leadPublicId: z.string().nullable(),
  actorUserPublicId: z.string(),
  activityType: crmActivityTypeSchema,
  subject: z.string(),
  description: z.string().nullable(),
  occurredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type CrmActivitySummary = z.infer<typeof crmActivitySummarySchema>;

export const crmActivityListResponseSchema = z.object({
  activities: z.array(crmActivitySummarySchema),
  nextCursor: z.string().nullable(),
});

export type CrmActivityListResponse = z.infer<typeof crmActivityListResponseSchema>;

export const createCrmFollowUpRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  contactPublicId: z
    .string()
    .regex(/^PS-CONTACT-\d+$/)
    .optional()
    .nullable(),
  leadPublicId: z
    .string()
    .regex(/^PS-LEAD-\d+$/)
    .optional()
    .nullable(),
  assignedUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .optional()
    .nullable(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  dueAt: z.string().datetime(),
  priority: followUpPrioritySchema.default('MEDIUM'),
  reminderAt: z.string().datetime().optional().nullable(),
});

export type CreateCrmFollowUpRequest = z.infer<typeof createCrmFollowUpRequestSchema>;

export const updateCrmFollowUpRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  dueAt: z.string().datetime().optional(),
  priority: followUpPrioritySchema.optional(),
  status: followUpStatusSchema.optional(),
  assignedUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .optional()
    .nullable(),
  reminderAt: z.string().datetime().optional().nullable(),
  expectedVersion: z.number().int().positive().optional(),
});

export type UpdateCrmFollowUpRequest = z.infer<typeof updateCrmFollowUpRequestSchema>;

export const crmFollowUpListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  status: followUpStatusSchema.optional(),
  priority: followUpPrioritySchema.optional(),
  assignedUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .optional(),
  leadPublicId: z
    .string()
    .regex(/^PS-LEAD-\d+$/)
    .optional(),
  bucket: z.enum(['OVERDUE', 'TODAY', 'UPCOMING', 'COMPLETED']).optional(),
});

export type CrmFollowUpListQuery = z.infer<typeof crmFollowUpListQuerySchema>;

export const crmFollowUpSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  contactPublicId: z.string().nullable(),
  leadPublicId: z.string().nullable(),
  assignedUserPublicId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  dueAt: z.string().datetime(),
  priority: followUpPrioritySchema,
  status: followUpStatusSchema,
  reminderAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CrmFollowUpSummary = z.infer<typeof crmFollowUpSummarySchema>;

export const crmFollowUpListResponseSchema = z.object({
  followUps: z.array(crmFollowUpSummarySchema),
  nextCursor: z.string().nullable(),
});

export type CrmFollowUpListResponse = z.infer<typeof crmFollowUpListResponseSchema>;

export const createCrmSiteVisitRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  leadPublicId: z.string().regex(/^PS-LEAD-\d+$/),
  contactPublicId: z
    .string()
    .regex(/^PS-CONTACT-\d+$/)
    .optional()
    .nullable(),
  assignedUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .optional()
    .nullable(),
  propertyPublicId: z
    .string()
    .regex(/^PS-PROP-\d+$/)
    .optional()
    .nullable(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional()
    .nullable(),
  scheduledAt: z.string().datetime(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateCrmSiteVisitRequest = z.infer<typeof createCrmSiteVisitRequestSchema>;

export const updateCrmSiteVisitRequestSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: siteVisitStatusSchema.optional(),
  outcome: siteVisitOutcomeSchema.optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  assignedUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .optional()
    .nullable(),
  contactPublicId: z
    .string()
    .regex(/^PS-CONTACT-\d+$/)
    .optional()
    .nullable(),
  propertyPublicId: z
    .string()
    .regex(/^PS-PROP-\d+$/)
    .optional()
    .nullable(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional()
    .nullable(),
  expectedVersion: z.number().int().positive().optional(),
});

export type UpdateCrmSiteVisitRequest = z.infer<typeof updateCrmSiteVisitRequestSchema>;

export const crmSiteVisitListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  status: siteVisitStatusSchema.optional(),
  leadPublicId: z
    .string()
    .regex(/^PS-LEAD-\d+$/)
    .optional(),
  bucket: z.enum(['UPCOMING', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
});

export type CrmSiteVisitListQuery = z.infer<typeof crmSiteVisitListQuerySchema>;

export const crmSiteVisitSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  leadPublicId: z.string(),
  contactPublicId: z.string().nullable(),
  assignedUserPublicId: z.string().nullable(),
  propertyPublicId: z.string().nullable(),
  projectPublicId: z.string().nullable(),
  scheduledAt: z.string().datetime(),
  status: siteVisitStatusSchema,
  outcome: siteVisitOutcomeSchema.nullable(),
  notes: z.string().nullable(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CrmSiteVisitSummary = z.infer<typeof crmSiteVisitSummarySchema>;

export const crmSiteVisitListResponseSchema = z.object({
  siteVisits: z.array(crmSiteVisitSummarySchema),
  nextCursor: z.string().nullable(),
});

export type CrmSiteVisitListResponse = z.infer<typeof crmSiteVisitListResponseSchema>;

export const createCrmDealRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  leadPublicId: z.string().regex(/^PS-LEAD-\d+$/),
  contactPublicId: z
    .string()
    .regex(/^PS-CONTACT-\d+$/)
    .optional()
    .nullable(),
  propertyPublicId: z
    .string()
    .regex(/^PS-PROP-\d+$/)
    .optional()
    .nullable(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional()
    .nullable(),
  expectedValueMinor: optionalMoneyMinorSchema,
  currency: z.string().trim().length(3).default('INR'),
  expectedCloseDate: z.string().date().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: dealStatusSchema.default('OPEN'),
});

export type CreateCrmDealRequest = z.infer<typeof createCrmDealRequestSchema>;

export const updateCrmDealRequestSchema = z.object({
  contactPublicId: z
    .string()
    .regex(/^PS-CONTACT-\d+$/)
    .optional()
    .nullable(),
  propertyPublicId: z
    .string()
    .regex(/^PS-PROP-\d+$/)
    .optional()
    .nullable(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional()
    .nullable(),
  expectedValueMinor: optionalMoneyMinorSchema,
  currency: z.string().trim().length(3).optional(),
  expectedCloseDate: z.string().date().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: dealStatusSchema.optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export type UpdateCrmDealRequest = z.infer<typeof updateCrmDealRequestSchema>;

export const crmDealListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  status: dealStatusSchema.optional(),
  leadPublicId: z
    .string()
    .regex(/^PS-LEAD-\d+$/)
    .optional(),
});

export type CrmDealListQuery = z.infer<typeof crmDealListQuerySchema>;

export const crmDealSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  leadPublicId: z.string(),
  contactPublicId: z.string().nullable(),
  propertyPublicId: z.string().nullable(),
  projectPublicId: z.string().nullable(),
  status: dealStatusSchema,
  expectedValueMinor: z.string().nullable(),
  currency: z.string(),
  expectedCloseDate: z.string().nullable(),
  closedAt: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CrmDealSummary = z.infer<typeof crmDealSummarySchema>;

export const crmDealListResponseSchema = z.object({
  deals: z.array(crmDealSummarySchema),
  nextCursor: z.string().nullable(),
});

export type CrmDealListResponse = z.infer<typeof crmDealListResponseSchema>;

export const assignCrmLeadRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  assigneeUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .nullable(),
  expectedVersion: z.number().int().positive().optional(),
});

export type AssignCrmLeadRequest = z.infer<typeof assignCrmLeadRequestSchema>;

export const updateCrmLeadStatusRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  status: leadStatusSchema,
  expectedVersion: z.number().int().positive().optional(),
  allowAdminOverride: z.boolean().optional(),
});

export type UpdateCrmLeadStatusRequest = z.infer<typeof updateCrmLeadStatusRequestSchema>;

export const crmLeadListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  status: leadStatusSchema.optional(),
  assignedUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .optional(),
  q: z.string().trim().max(120).optional(),
});

export type CrmLeadListQuery = z.infer<typeof crmLeadListQuerySchema>;

export const crmLeadSummarySchema = leadSummarySchema.extend({
  contactPublicId: z.string().nullable(),
  contactDisplayName: z.string().nullable(),
  nextFollowUpAt: z.string().datetime().nullable(),
  lastActivityAt: z.string().datetime().nullable(),
});

export type CrmLeadSummary = z.infer<typeof crmLeadSummarySchema>;

export const crmLeadListResponseSchema = z.object({
  leads: z.array(crmLeadSummarySchema),
  nextCursor: z.string().nullable(),
});

export type CrmLeadListResponse = z.infer<typeof crmLeadListResponseSchema>;

export const crmLeadDetailSchema = crmLeadSummarySchema.extend({
  contacts: z.array(crmContactSummarySchema),
  activities: z.array(crmActivitySummarySchema),
  followUps: z.array(crmFollowUpSummarySchema),
  siteVisits: z.array(crmSiteVisitSummarySchema),
  deals: z.array(crmDealSummarySchema),
});

export type CrmLeadDetail = z.infer<typeof crmLeadDetailSchema>;

export const crmOverviewQuerySchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
});

export type CrmOverviewQuery = z.infer<typeof crmOverviewQuerySchema>;

export const crmOverviewSchema = z.object({
  organizationPublicId: z.string(),
  activeLeads: z.number().int().nonnegative(),
  newLeads: z.number().int().nonnegative(),
  followUpsDue: z.number().int().nonnegative(),
  upcomingSiteVisits: z.number().int().nonnegative(),
  qualifiedLeads: z.number().int().nonnegative(),
  openNegotiations: z.number().int().nonnegative(),
  bookedDeals: z.number().int().nonnegative(),
  closedDeals: z.number().int().nonnegative(),
  contacts: z.number().int().nonnegative(),
});

export type CrmOverview = z.infer<typeof crmOverviewSchema>;
