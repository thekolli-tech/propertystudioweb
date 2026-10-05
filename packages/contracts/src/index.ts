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
