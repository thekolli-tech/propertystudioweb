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
  verificationStatus: agencyVerificationStatusSchema,
  verifiedBadge: z.boolean(),
});

export type PublicDeveloperProfile = z.infer<typeof publicDeveloperProfileSchema>;

export const publicAgencyProfileSchema = publicDeveloperProfileSchema.extend({
  specialization: z.string().nullable(),
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
export const catalogEntityTypeSchema = z.enum([
  'PROJECT',
  'PROPERTY',
  'COMMUNITY',
  'VERIFICATION_CASE',
]);
export const mediaTypeSchema = z.enum([
  'IMAGE',
  'VIDEO',
  'FLOOR_PLAN',
  'AUDIO',
  'DOCUMENT',
  'EMBED',
  'OTHER',
]);
export const assetVisibilitySchema = z.enum(['PRIVATE', 'PUBLIC']);
export const mediaLifecycleStatusSchema = z.enum([
  'DRAFT',
  'PROCESSING',
  'READY',
  'PUBLISHED',
  'ARCHIVED',
  'REJECTED',
]);
export const mediaModerationStatusSchema = z.enum([
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'FLAGGED',
  'ARCHIVED',
]);
export const editorialContentStatusSchema = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED',
]);
export const editorialContentKindSchema = z.enum([
  'MARKET_ARTICLE',
  'PROJECT_ANALYSIS',
  'LOCALITY_GUIDE',
  'INVESTMENT_EXPLAINER',
  'CONSTRUCTION_UPDATE',
  'BUILDER_INTERVIEW',
  'PROPERTY_WALKTHROUGH',
  'LEGAL_EXPLAINER',
  'INFRASTRUCTURE_STORY',
  'PLATFORM_REPORT',
  'OTHER',
]);
export const mediaCollectionStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const mediaCollectionItemKindSchema = z.enum(['MEDIA', 'EDITORIAL']);
export const mediaAnalyticsEventTypeSchema = z.enum([
  'VIEW',
  'PLAY',
  'COMPLETION',
  'CLICK',
  'SHARE',
  'SAVE',
  'ENGAGEMENT',
]);
export const externalMediaProviderKindSchema = z.enum([
  'YOUTUBE',
  'VIMEO',
  'INSTAGRAM',
  'FACEBOOK',
  'OTHER',
]);
export type ExternalMediaProviderKind = z.infer<typeof externalMediaProviderKindSchema>;
export const externalMediaProviderStatusSchema = z.enum(['UNAVAILABLE', 'CONFIGURED', 'DISABLED']);
export type ExternalMediaProviderStatus = z.infer<typeof externalMediaProviderStatusSchema>;

export type MediaLifecycleStatus = z.infer<typeof mediaLifecycleStatusSchema>;
export type MediaModerationStatus = z.infer<typeof mediaModerationStatusSchema>;
export type EditorialContentStatus = z.infer<typeof editorialContentStatusSchema>;
export type EditorialContentKind = z.infer<typeof editorialContentKindSchema>;
export type MediaCollectionStatus = z.infer<typeof mediaCollectionStatusSchema>;
export type MediaCollectionItemKind = z.infer<typeof mediaCollectionItemKindSchema>;
export type MediaAnalyticsEventType = z.infer<typeof mediaAnalyticsEventTypeSchema>;

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
  title: z.string().nullable().optional(),
  lifecycleStatus: mediaLifecycleStatusSchema.optional(),
  slug: z.string().nullable().optional(),
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

export const trustSubjectStatusSchema = z.enum([
  'UNVERIFIED',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'FLAGGED',
  'REVOKED',
]);

export const publicProjectDetailSchema = publicProjectSummarySchema.extend({
  description: z.string().nullable(),
  state: z.string().nullable(),
  countryCode: z.string(),
  totalAreaSqft: z.number().nullable(),
  totalUnits: z.number().nullable(),
  possessionDate: z.string().nullable(),
  propertyCount: z.number().int().nonnegative(),
  trustStatus: trustSubjectStatusSchema,
  verifiedBadge: z.boolean(),
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
  trustStatus: trustSubjectStatusSchema,
  verifiedBadge: z.boolean(),
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

// ---------------------------------------------------------------------------
// Phase 9 — Money, subscriptions & monetization
// ---------------------------------------------------------------------------

export const billingIntervalSchema = z.enum(['MONTHLY', 'YEARLY']);
export const subscriptionStatusSchema = z.enum([
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'PAUSED',
  'CANCELLED',
  'EXPIRED',
]);
export const entitlementKeySchema = z.enum([
  'LEAD_MARKETPLACE_ACCESS',
  'LEAD_PURCHASE',
  'CRM_ACCESS',
  'ADVANCED_LEAD_ACCESS',
  'PROJECT_CLAIM',
  'PREMIUM_PROJECT_COMMUNITY',
  'ANALYTICS',
  'EXPORTS',
]);
export const walletLedgerEntryTypeSchema = z.enum([
  'CREDIT',
  'DEBIT',
  'REFUND',
  'ADJUSTMENT',
  'EXPIRATION',
]);
export const financialTransactionTypeSchema = z.enum([
  'SUBSCRIPTION',
  'WALLET_TOPUP',
  'LEAD_PURCHASE',
  'REFUND',
  'ADJUSTMENT',
]);
export const financialTransactionStatusSchema = z.enum([
  'PENDING',
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'CANCELLED',
]);
export const invoiceStatusSchema = z.enum(['DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE']);
export const paymentProviderCodeSchema = z.enum(['NONE', 'RAZORPAY', 'MANUAL', 'SANDBOX']);
export const refundTypeSchema = z.enum(['FULL', 'PARTIAL']);
export const refundStatusSchema = z.enum(['PENDING', 'SUCCEEDED', 'FAILED']);
export const leadPurchaseStatusSchema = z.enum(['PENDING', 'COMPLETED', 'REFUNDED', 'FAILED']);

export const createSubscriptionPlanRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[A-Z0-9_]+$/, 'Plan code must be uppercase snake-case.'),
  billingInterval: billingIntervalSchema,
  priceMinor: moneyMinorSchema,
  currency: z.string().length(3).default('INR'),
  includedCredits: moneyMinorSchema.default(0n),
  leadPurchasePriceMinor: moneyMinorSchema.default(50_000n),
  active: z.boolean().default(true),
  entitlements: z.array(entitlementKeySchema).default([]),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});
export type CreateSubscriptionPlanRequest = z.infer<typeof createSubscriptionPlanRequestSchema>;

export const updateSubscriptionPlanRequestSchema = createSubscriptionPlanRequestSchema
  .partial()
  .extend({
    expectedVersion: z.number().int().positive().optional(),
  });
export type UpdateSubscriptionPlanRequest = z.infer<typeof updateSubscriptionPlanRequestSchema>;

export const subscriptionPlanSummarySchema = z.object({
  publicId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  code: z.string(),
  billingInterval: billingIntervalSchema,
  priceMinor: z.string(),
  currency: z.string(),
  includedCredits: z.string(),
  leadPurchasePriceMinor: z.string(),
  active: z.boolean(),
  entitlements: z.array(entitlementKeySchema),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SubscriptionPlanSummary = z.infer<typeof subscriptionPlanSummarySchema>;

export const subscriptionPlanListQuerySchema = cursorPaginationQuerySchema.extend({
  active: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  }, z.boolean().optional()),
});
export type SubscriptionPlanListQuery = z.infer<typeof subscriptionPlanListQuerySchema>;

export const subscriptionPlanListResponseSchema = z.object({
  plans: z.array(subscriptionPlanSummarySchema),
  nextCursor: z.string().nullable(),
});
export type SubscriptionPlanListResponse = z.infer<typeof subscriptionPlanListResponseSchema>;

export const createOrganizationSubscriptionRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  planPublicId: z.string().regex(/^PS-PLAN-\d+$/),
  provider: paymentProviderCodeSchema.default('SANDBOX'),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});
export type CreateOrganizationSubscriptionRequest = z.infer<
  typeof createOrganizationSubscriptionRequestSchema
>;

export const cancelOrganizationSubscriptionRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  cancelAtPeriodEnd: z.boolean().default(true),
});
export type CancelOrganizationSubscriptionRequest = z.infer<
  typeof cancelOrganizationSubscriptionRequestSchema
>;

export const organizationSubscriptionSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  planPublicId: z.string(),
  planName: z.string(),
  planCode: z.string(),
  status: subscriptionStatusSchema,
  provider: paymentProviderCodeSchema,
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean(),
  cancelledAt: z.string().datetime().nullable(),
  entitlements: z.array(entitlementKeySchema),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type OrganizationSubscriptionSummary = z.infer<typeof organizationSubscriptionSummarySchema>;

export const billingOverviewQuerySchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
});
export type BillingOverviewQuery = z.infer<typeof billingOverviewQuerySchema>;

export const billingOverviewSchema = z.object({
  organizationPublicId: z.string(),
  subscription: organizationSubscriptionSummarySchema.nullable(),
  walletBalanceMinor: z.string(),
  walletCurrency: z.string(),
  openInvoices: z.number().int().nonnegative(),
  pendingPayments: z.number().int().nonnegative(),
  completedLeadPurchases: z.number().int().nonnegative(),
  entitlements: z.array(entitlementKeySchema),
});
export type BillingOverview = z.infer<typeof billingOverviewSchema>;

export const walletSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  currency: z.string(),
  balanceMinor: z.string(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type WalletSummary = z.infer<typeof walletSummarySchema>;

export const walletLedgerEntrySchema = z.object({
  publicId: z.string(),
  walletPublicId: z.string(),
  organizationPublicId: z.string(),
  entryType: walletLedgerEntryTypeSchema,
  amountMinor: z.string(),
  balanceAfterMinor: z.string(),
  currency: z.string(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type WalletLedgerEntry = z.infer<typeof walletLedgerEntrySchema>;

export const walletLedgerListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  entryType: walletLedgerEntryTypeSchema.optional(),
});
export type WalletLedgerListQuery = z.infer<typeof walletLedgerListQuerySchema>;

export const walletLedgerListResponseSchema = z.object({
  entries: z.array(walletLedgerEntrySchema),
  nextCursor: z.string().nullable(),
});
export type WalletLedgerListResponse = z.infer<typeof walletLedgerListResponseSchema>;

export const walletTopUpRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  amountMinor: moneyMinorSchema.refine((value) => value > 0n, {
    message: 'Top-up amount must be positive.',
  }),
  currency: z.string().length(3).default('INR'),
  idempotencyKey: z.string().trim().min(8).max(128),
  description: z.string().trim().max(500).optional(),
});
export type WalletTopUpRequest = z.infer<typeof walletTopUpRequestSchema>;

export const financialTransactionSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  type: financialTransactionTypeSchema,
  status: financialTransactionStatusSchema,
  provider: paymentProviderCodeSchema,
  providerTransactionId: z.string().nullable(),
  amountMinor: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type FinancialTransactionSummary = z.infer<typeof financialTransactionSummarySchema>;

export const financialTransactionListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
  type: financialTransactionTypeSchema.optional(),
  status: financialTransactionStatusSchema.optional(),
});
export type FinancialTransactionListQuery = z.infer<typeof financialTransactionListQuerySchema>;

export const financialTransactionListResponseSchema = z.object({
  transactions: z.array(financialTransactionSummarySchema),
  nextCursor: z.string().nullable(),
});
export type FinancialTransactionListResponse = z.infer<
  typeof financialTransactionListResponseSchema
>;

export const invoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().positive(),
  unitAmountMinor: z.string(),
  amountMinor: z.string(),
});
export type InvoiceItemSummary = z.infer<typeof invoiceItemSchema>;

export const invoiceSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  invoiceNumber: z.string(),
  status: invoiceStatusSchema,
  subtotalMinor: z.string(),
  taxMinor: z.string(),
  totalMinor: z.string(),
  currency: z.string(),
  issuedAt: z.string().datetime().nullable(),
  dueAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
  financialTransactionPublicId: z.string().nullable(),
  items: z.array(invoiceItemSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type InvoiceSummary = z.infer<typeof invoiceSummarySchema>;

export const invoiceListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
  status: invoiceStatusSchema.optional(),
});
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

export const invoiceListResponseSchema = z.object({
  invoices: z.array(invoiceSummarySchema),
  nextCursor: z.string().nullable(),
});
export type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;

export const createRefundRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  transactionPublicId: z.string().regex(/^PS-PAY-\d+$/),
  type: refundTypeSchema,
  amountMinor: moneyMinorSchema.optional(),
  reason: z.string().trim().max(500).optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(128),
});
export type CreateRefundRequest = z.infer<typeof createRefundRequestSchema>;

export const refundSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  transactionPublicId: z.string(),
  type: refundTypeSchema,
  status: refundStatusSchema,
  amountMinor: z.string(),
  currency: z.string(),
  reason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RefundSummary = z.infer<typeof refundSummarySchema>;

export const createLeadPurchaseRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  leadPublicId: z.string().regex(/^PS-LEAD-\d+$/),
  idempotencyKey: z.string().trim().min(8).max(128),
});
export type CreateLeadPurchaseRequest = z.infer<typeof createLeadPurchaseRequestSchema>;

export const leadPurchaseSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  leadPublicId: z.string(),
  financialTransactionPublicId: z.string().nullable(),
  status: leadPurchaseStatusSchema,
  amountMinor: z.string(),
  currency: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LeadPurchaseSummary = z.infer<typeof leadPurchaseSummarySchema>;

export const adminWalletListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
});
export type AdminWalletListQuery = z.infer<typeof adminWalletListQuerySchema>;

export const adminWalletListResponseSchema = z.object({
  wallets: z.array(walletSummarySchema),
  nextCursor: z.string().nullable(),
});
export type AdminWalletListResponse = z.infer<typeof adminWalletListResponseSchema>;

export const adminSubscriptionListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
  status: subscriptionStatusSchema.optional(),
});
export type AdminSubscriptionListQuery = z.infer<typeof adminSubscriptionListQuerySchema>;

export const adminSubscriptionListResponseSchema = z.object({
  subscriptions: z.array(organizationSubscriptionSummarySchema),
  nextCursor: z.string().nullable(),
});
export type AdminSubscriptionListResponse = z.infer<typeof adminSubscriptionListResponseSchema>;

export type BillingInterval = z.infer<typeof billingIntervalSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type EntitlementKey = z.infer<typeof entitlementKeySchema>;
export type WalletLedgerEntryType = z.infer<typeof walletLedgerEntryTypeSchema>;
export type FinancialTransactionType = z.infer<typeof financialTransactionTypeSchema>;
export type FinancialTransactionStatus = z.infer<typeof financialTransactionStatusSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type PaymentProviderCode = z.infer<typeof paymentProviderCodeSchema>;
export type RefundType = z.infer<typeof refundTypeSchema>;
export type RefundStatus = z.infer<typeof refundStatusSchema>;
export type LeadPurchaseStatus = z.infer<typeof leadPurchaseStatusSchema>;

export const walletTopUpResponseSchema = z.object({
  transaction: financialTransactionSummarySchema,
  wallet: walletSummarySchema,
});
export type WalletTopUpResponse = z.infer<typeof walletTopUpResponseSchema>;

// --- Phase 10: trust, verification, reviews, notifications, communications ---

export const verificationCaseStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED',
  'EXPIRED',
  'REVOKED',
]);
export type VerificationCaseStatus = z.infer<typeof verificationCaseStatusSchema>;

export const verificationSubjectTypeSchema = z.enum(['AGENT', 'DEVELOPER', 'PROJECT', 'PROPERTY']);
export type VerificationSubjectType = z.infer<typeof verificationSubjectTypeSchema>;

export const verificationDocumentTypeSchema = z.enum([
  'RERA_CERTIFICATE',
  'GOVERNMENT_ID',
  'COMPANY_REGISTRATION',
  'AUTHORIZATION_LETTER',
  'PROJECT_APPROVAL',
  'OWNERSHIP_DOCUMENT',
  'PROPERTY_DOCUMENT',
  'OTHER',
]);
export type VerificationDocumentType = z.infer<typeof verificationDocumentTypeSchema>;

export const verificationDocumentStatusSchema = z.enum([
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'REPLACEMENT_REQUIRED',
]);
export type VerificationDocumentStatus = z.infer<typeof verificationDocumentStatusSchema>;

export const reviewSubjectTypeSchema = z.enum(['PROJECT', 'PROPERTY', 'DEVELOPER', 'AGENT']);
export type ReviewSubjectType = z.infer<typeof reviewSubjectTypeSchema>;

export const reviewStatusSchema = z.enum(['PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED', 'FLAGGED']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const reviewDimensionSchema = z.enum([
  'EXECUTION',
  'CONSTRUCTION_QUALITY',
  'DOCUMENTATION',
  'TIMELINE',
  'AMENITIES',
  'LOCATION',
  'OVERALL',
]);
export type ReviewDimension = z.infer<typeof reviewDimensionSchema>;

export const reviewReportReasonSchema = z.enum([
  'SPAM',
  'ABUSE',
  'FALSE_INFORMATION',
  'PERSONAL_INFORMATION',
  'DUPLICATE',
  'HARASSMENT',
  'OTHER',
]);
export type ReviewReportReason = z.infer<typeof reviewReportReasonSchema>;

export const notificationTypeSchema = z.enum([
  'VERIFICATION_SUBMITTED',
  'VERIFICATION_APPROVED',
  'VERIFICATION_REJECTED',
  'VERIFICATION_CHANGES_REQUESTED',
  'VERIFICATION_EXPIRING',
  'NEW_LEAD',
  'LEAD_ASSIGNED',
  'LEAD_PURCHASED',
  'SITE_VISIT_CREATED',
  'SITE_VISIT_UPDATED',
  'REVIEW_PUBLISHED',
  'REVIEW_REPORTED',
  'MESSAGE_RECEIVED',
  'SAVED_SEARCH_MATCH',
  'SYSTEM',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSeveritySchema = z.enum(['INFO', 'SUCCESS', 'WARNING', 'CRITICAL']);
export type NotificationSeverity = z.infer<typeof notificationSeveritySchema>;

export const notificationChannelSchema = z.enum(['IN_APP', 'EMAIL', 'WHATSAPP', 'SMS']);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

export const conversationTypeSchema = z.enum(['LEAD', 'PROPERTY', 'PROJECT', 'GENERAL']);
export type ConversationType = z.infer<typeof conversationTypeSchema>;

export const conversationStatusSchema = z.enum(['OPEN', 'RESTRICTED', 'CLOSED']);
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;

export const leadAccessStateSchema = z.enum(['PURCHASED', 'ACTIVE', 'REVOKED', 'EXPIRED']);
export type LeadAccessState = z.infer<typeof leadAccessStateSchema>;

export const contentReportStatusSchema = z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']);
export type ContentReportStatus = z.infer<typeof contentReportStatusSchema>;

export const reviewEligibilityBasisSchema = z.enum([
  'VERIFIED_CLIENT',
  'SITE_VISITOR',
  'AUTHENTICATED_USER',
]);
export type ReviewEligibilityBasis = z.infer<typeof reviewEligibilityBasisSchema>;

export const trustScoreStateSchema = z.enum(['INSUFFICIENT_DATA', 'READY']);
export type TrustScoreState = z.infer<typeof trustScoreStateSchema>;

export const createVerificationCaseRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  subjectType: verificationSubjectTypeSchema,
  subjectPublicId: z.string().regex(/^PS-(DEV|AGT|PROJ|PROP)-\d+$/),
  verificationType: verificationSubjectTypeSchema,
  reraNumber: z.string().trim().max(64).optional().nullable(),
  declarationAccepted: z.boolean().default(false),
});
export type CreateVerificationCaseRequest = z.infer<typeof createVerificationCaseRequestSchema>;

export const updateVerificationCaseRequestSchema = z.object({
  reraNumber: z.string().trim().max(64).optional().nullable(),
  declarationAccepted: z.boolean().optional(),
});
export type UpdateVerificationCaseRequest = z.infer<typeof updateVerificationCaseRequestSchema>;

export const submitVerificationCaseRequestSchema = z.object({
  declarationAccepted: z.boolean(),
});
export type SubmitVerificationCaseRequest = z.infer<typeof submitVerificationCaseRequestSchema>;

export const reviewVerificationCaseRequestSchema = z.object({
  reviewerNotes: z.string().trim().max(2000).optional().nullable(),
  rejectionReason: z.string().trim().max(1000).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});
export type ReviewVerificationCaseRequest = z.infer<typeof reviewVerificationCaseRequestSchema>;

export const attachVerificationDocumentRequestSchema = z.object({
  documentType: verificationDocumentTypeSchema,
  storageKey: z.string().trim().min(1).max(512),
  mimeType: z.string().trim().min(3).max(120),
  title: z.string().trim().min(2).max(200),
  fileSizeBytes: moneyMinorSchema,
  extractedReference: z.string().trim().max(160).optional().nullable(),
});
export type AttachVerificationDocumentRequest = z.infer<
  typeof attachVerificationDocumentRequestSchema
>;

export const updateVerificationDocumentRequestSchema = z.object({
  status: verificationDocumentStatusSchema,
  reviewerNotes: z.string().trim().max(1000).optional().nullable(),
  extractedReference: z.string().trim().max(160).optional().nullable(),
});
export type UpdateVerificationDocumentRequest = z.infer<
  typeof updateVerificationDocumentRequestSchema
>;

export const verificationDocumentSummarySchema = z.object({
  publicId: z.string(),
  documentAssetPublicId: z.string(),
  documentType: verificationDocumentTypeSchema,
  status: verificationDocumentStatusSchema,
  extractedReference: z.string().nullable(),
  reviewerNotes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type VerificationDocumentSummary = z.infer<typeof verificationDocumentSummarySchema>;

export const verificationDocumentAccessSchema = z.object({
  documentPublicId: z.string(),
  casePublicId: z.string(),
  url: z.string().url(),
  expiresAt: z.string().datetime(),
  expiresInSeconds: z.number().int().positive().max(900),
});
export type VerificationDocumentAccess = z.infer<typeof verificationDocumentAccessSchema>;

export const verificationCaseSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string().nullable(),
  subjectType: verificationSubjectTypeSchema,
  subjectPublicId: z.string(),
  verificationType: verificationSubjectTypeSchema,
  status: verificationCaseStatusSchema,
  reraNumber: z.string().nullable(),
  declarationAccepted: z.boolean(),
  submittedAt: z.string().datetime().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  rejectionReason: z.string().nullable(),
  reviewerNotes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type VerificationCaseSummary = z.infer<typeof verificationCaseSummarySchema>;

export const verificationCaseDetailSchema = verificationCaseSummarySchema.extend({
  documents: z.array(verificationDocumentSummarySchema).default([]),
});
export type VerificationCaseDetail = z.infer<typeof verificationCaseDetailSchema>;

export const verificationCaseListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
  status: verificationCaseStatusSchema.optional(),
  subjectType: verificationSubjectTypeSchema.optional(),
});
export type VerificationCaseListQuery = z.infer<typeof verificationCaseListQuerySchema>;

export const verificationCaseListResponseSchema = z.object({
  cases: z.array(verificationCaseSummarySchema),
  nextCursor: z.string().nullable(),
});
export type VerificationCaseListResponse = z.infer<typeof verificationCaseListResponseSchema>;

export const adminVerificationCaseListQuerySchema = cursorPaginationQuerySchema.extend({
  status: verificationCaseStatusSchema.optional(),
  subjectType: verificationSubjectTypeSchema.optional(),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
});
export type AdminVerificationCaseListQuery = z.infer<typeof adminVerificationCaseListQuerySchema>;

export const reviewRatingInputSchema = z.object({
  dimension: reviewDimensionSchema,
  rating: z.number().int().min(1).max(5),
});
export type ReviewRatingInput = z.infer<typeof reviewRatingInputSchema>;

export const createReviewRequestSchema = z.object({
  subjectType: reviewSubjectTypeSchema,
  subjectPublicId: z.string().regex(/^PS-(DEV|AGT|PROJ|PROP)-\d+$/),
  title: z.string().trim().max(200).optional().nullable(),
  body: z.string().trim().min(10).max(4000),
  overallRating: z.number().int().min(1).max(5),
  ratings: z.array(reviewRatingInputSchema).max(7).default([]),
});
export type CreateReviewRequest = z.infer<typeof createReviewRequestSchema>;

export const updateOwnReviewRequestSchema = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  body: z.string().trim().min(10).max(4000).optional(),
  overallRating: z.number().int().min(1).max(5).optional(),
  ratings: z.array(reviewRatingInputSchema).max(7).optional(),
});
export type UpdateOwnReviewRequest = z.infer<typeof updateOwnReviewRequestSchema>;

export const reportReviewRequestSchema = z.object({
  reason: reviewReportReasonSchema,
  details: z.string().trim().max(1000).optional().nullable(),
});
export type ReportReviewRequest = z.infer<typeof reportReviewRequestSchema>;

export const moderateReviewRequestSchema = z.object({
  action: z.enum(['HIDE', 'REJECT', 'RESTORE', 'FLAG']),
  moderatorNotes: z.string().trim().max(1000).optional().nullable(),
});
export type ModerateReviewRequest = z.infer<typeof moderateReviewRequestSchema>;

export const reviewRatingSummarySchema = z.object({
  dimension: reviewDimensionSchema,
  rating: z.number().int().min(1).max(5),
});
export type ReviewRatingSummary = z.infer<typeof reviewRatingSummarySchema>;

export const reviewSummarySchema = z.object({
  publicId: z.string(),
  authorUserPublicId: z.string(),
  organizationPublicId: z.string().nullable(),
  subjectType: reviewSubjectTypeSchema,
  subjectPublicId: z.string(),
  title: z.string().nullable(),
  body: z.string(),
  status: reviewStatusSchema,
  overallRating: z.number().int().min(1).max(5),
  eligibilityBasis: reviewEligibilityBasisSchema,
  ratings: z.array(reviewRatingSummarySchema).default([]),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ReviewSummary = z.infer<typeof reviewSummarySchema>;

export const reviewListQuerySchema = cursorPaginationQuerySchema.extend({
  subjectType: reviewSubjectTypeSchema.optional(),
  subjectPublicId: z
    .string()
    .regex(/^PS-(DEV|AGT|PROJ|PROP)-\d+$/)
    .optional(),
  status: reviewStatusSchema.optional(),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
});
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

export const reviewListResponseSchema = z.object({
  reviews: z.array(reviewSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ReviewListResponse = z.infer<typeof reviewListResponseSchema>;

export const reviewReportSummarySchema = z.object({
  publicId: z.string(),
  reviewPublicId: z.string(),
  reason: reviewReportReasonSchema,
  details: z.string().nullable(),
  status: contentReportStatusSchema,
  createdAt: z.string().datetime(),
});
export type ReviewReportSummary = z.infer<typeof reviewReportSummarySchema>;

export const trustScoreResponseSchema = z.object({
  subjectType: reviewSubjectTypeSchema,
  subjectPublicId: z.string(),
  state: trustScoreStateSchema,
  score: z.number().int().min(0).max(100).nullable(),
  reviewCount: z.number().int().nonnegative(),
  overallAverage: z.number().nullable(),
  structuredAverage: z.number().nullable(),
  verificationComponent: z.number().nullable(),
  verified: z.boolean(),
  formula: z
    .string()
    .default(
      'score = round(((0.6 * overallAvg) + (0.25 * structuredAvg) + (0.15 * verificationComponent)) / 5 * 100); insufficient if reviewCount < 3',
    ),
});
export type TrustScoreResponse = z.infer<typeof trustScoreResponseSchema>;

export const notificationSummarySchema = z.object({
  publicId: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  severity: notificationSeveritySchema,
  readAt: z.string().datetime().nullable(),
  entityType: z.string().nullable(),
  entityPublicId: z.string().nullable(),
  organizationPublicId: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type NotificationSummary = z.infer<typeof notificationSummarySchema>;

export const notificationListQuerySchema = cursorPaginationQuerySchema.extend({
  unreadOnly: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  }, z.boolean().optional()),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const notificationListResponseSchema = z.object({
  notifications: z.array(notificationSummarySchema),
  nextCursor: z.string().nullable(),
});
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;

export const notificationPreferenceSchema = z.object({
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  enabled: z.boolean(),
});
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

export const notificationPreferencesResponseSchema = z.object({
  preferences: z.array(notificationPreferenceSchema),
});
export type NotificationPreferencesResponse = z.infer<typeof notificationPreferencesResponseSchema>;

export const updateNotificationPreferencesRequestSchema = z.object({
  preferences: z.array(notificationPreferenceSchema).min(1).max(64),
});
export type UpdateNotificationPreferencesRequest = z.infer<
  typeof updateNotificationPreferencesRequestSchema
>;

export const createConversationRequestSchema = z.object({
  type: z.literal('LEAD'),
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  leadPublicId: z.string().regex(/^PS-LEAD-\d+$/),
  subjectLabel: z.string().trim().max(200).optional().nullable(),
  initialMessage: z.string().trim().min(1).max(4000).optional(),
});
export type CreateConversationRequest = z.infer<typeof createConversationRequestSchema>;

export const conversationParticipantSchema = z.object({
  userPublicId: z.string(),
  joinedAt: z.string().datetime(),
  lastReadAt: z.string().datetime().nullable(),
});
export type ConversationParticipantSummary = z.infer<typeof conversationParticipantSchema>;

export const messageSummarySchema = z.object({
  publicId: z.string(),
  conversationPublicId: z.string(),
  senderUserPublicId: z.string(),
  body: z.string(),
  createdAt: z.string().datetime(),
});
export type MessageSummary = z.infer<typeof messageSummarySchema>;

export const conversationSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string().nullable(),
  type: conversationTypeSchema,
  leadPublicId: z.string().nullable(),
  subjectLabel: z.string().nullable(),
  status: conversationStatusSchema,
  participants: z.array(conversationParticipantSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const conversationDetailSchema = conversationSummarySchema.extend({
  messages: z.array(messageSummarySchema).default([]),
});
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

export const conversationListQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
  type: conversationTypeSchema.optional(),
});
export type ConversationListQuery = z.infer<typeof conversationListQuerySchema>;

export const conversationListResponseSchema = z.object({
  conversations: z.array(conversationSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ConversationListResponse = z.infer<typeof conversationListResponseSchema>;

export const sendMessageRequestSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;

export const reportMessageRequestSchema = z.object({
  reason: reviewReportReasonSchema,
  details: z.string().trim().max(1000).optional().nullable(),
});
export type ReportMessageRequest = z.infer<typeof reportMessageRequestSchema>;

export const restrictConversationRequestSchema = z.object({
  status: z.enum(['RESTRICTED', 'OPEN', 'CLOSED']),
});
export type RestrictConversationRequest = z.infer<typeof restrictConversationRequestSchema>;

export const contentReportSummarySchema = z.object({
  publicId: z.string(),
  entityType: z.string(),
  entityPublicId: z.string(),
  reason: reviewReportReasonSchema,
  details: z.string().nullable(),
  status: contentReportStatusSchema,
  createdAt: z.string().datetime(),
});
export type ContentReportSummary = z.infer<typeof contentReportSummarySchema>;

export const adminReportListQuerySchema = cursorPaginationQuerySchema.extend({
  status: contentReportStatusSchema.optional(),
  entityType: z.string().trim().max(64).optional(),
});
export type AdminReportListQuery = z.infer<typeof adminReportListQuerySchema>;

export const adminReportItemSchema = z.object({
  publicId: z.string(),
  kind: z.enum(['REVIEW_REPORT', 'CONTENT_REPORT']),
  entityType: z.string(),
  entityPublicId: z.string(),
  reason: reviewReportReasonSchema,
  details: z.string().nullable(),
  status: contentReportStatusSchema,
  createdAt: z.string().datetime(),
});
export type AdminReportItem = z.infer<typeof adminReportItemSchema>;

export const adminReportListResponseSchema = z.object({
  reports: z.array(adminReportItemSchema),
  nextCursor: z.string().nullable(),
});
export type AdminReportListResponse = z.infer<typeof adminReportListResponseSchema>;

export const leadAccessStatusSchema = z.object({
  leadPublicId: z.string(),
  organizationPublicId: z.string(),
  accessState: leadAccessStateSchema.nullable(),
  grantPublicId: z.string().nullable(),
  grantedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  lastRevealedAt: z.string().datetime().nullable(),
  canReveal: z.boolean(),
});
export type LeadAccessStatus = z.infer<typeof leadAccessStatusSchema>;

export const leadContactRevealResponseSchema = z.object({
  leadPublicId: z.string(),
  accessState: leadAccessStateSchema,
  revealedAt: z.string().datetime(),
  contact: z.object({
    email: z.string().email(),
    displayHint: z.string(),
  }),
});
export type LeadContactRevealResponse = z.infer<typeof leadContactRevealResponseSchema>;

export const leadAccessQuerySchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
});
export type LeadAccessQuery = z.infer<typeof leadAccessQuerySchema>;

export type TrustSubjectStatus = z.infer<typeof trustSubjectStatusSchema>;

// --- Phase 11: intelligence, market data, AI orchestration ---

export const intelligenceSubjectTypeSchema = z.enum([
  'PROPERTY',
  'PROJECT',
  'LOCALITY',
  'CITY',
  'MICRO_MARKET',
]);
export type IntelligenceSubjectType = z.infer<typeof intelligenceSubjectTypeSchema>;

export const intelligenceDataStateSchema = z.enum(['READY', 'INSUFFICIENT_DATA', 'UNAVAILABLE']);
export type IntelligenceDataState = z.infer<typeof intelligenceDataStateSchema>;

export const intelligenceSourceTypeSchema = z.enum([
  'INTERNAL_CATALOG',
  'MANUAL_ADMIN',
  'EXTERNAL_PROVIDER',
  'MARKET_OBSERVATION',
  'DERIVED',
]);
export type IntelligenceSourceType = z.infer<typeof intelligenceSourceTypeSchema>;

export const infrastructureCategorySchema = z.enum([
  'ROAD',
  'METRO',
  'AIRPORT',
  'HOSPITAL',
  'SCHOOL',
  'SHOPPING',
  'IT_PARK',
  'UPCOMING',
  'OTHER',
]);
export type InfrastructureCategory = z.infer<typeof infrastructureCategorySchema>;

export const infrastructureStatusSchema = z.enum([
  'PLANNED',
  'UNDER_CONSTRUCTION',
  'OPERATIONAL',
  'UNKNOWN',
]);
export type InfrastructureStatus = z.infer<typeof infrastructureStatusSchema>;

export const aiJobTypeSchema = z.enum([
  'ASSISTANT',
  'PROPERTY_MATCH',
  'DOCUMENT_ANALYSIS',
  'FLOORPLAN_ANALYSIS',
  'VALUATION',
  'PROPERTY_SEARCH',
  'COMPARE',
]);
export type AiJobType = z.infer<typeof aiJobTypeSchema>;

export const aiJobStatusSchema = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']);
export type AiJobStatus = z.infer<typeof aiJobStatusSchema>;

export const documentAnalysisFindingKindSchema = z.enum([
  'EXTRACTED_FACT',
  'POTENTIAL_INCONSISTENCY',
  'MISSING_INFORMATION',
  'MODEL_OBSERVATION',
]);
export type DocumentAnalysisFindingKind = z.infer<typeof documentAnalysisFindingKindSchema>;

export const marketSnapshotSummarySchema = z.object({
  publicId: z.string(),
  subjectType: intelligenceSubjectTypeSchema,
  subjectKey: z.string(),
  propertyPublicId: z.string().nullable(),
  projectPublicId: z.string().nullable(),
  city: z.string().nullable(),
  locality: z.string().nullable(),
  microMarket: z.string().nullable(),
  medianPriceMinor: z.string().nullable(),
  medianPricePerSqftMinor: z.string().nullable(),
  currency: z.string(),
  inventorySignal: z.string().nullable(),
  demandSignal: z.string().nullable(),
  rentalYieldBps: z.number().int().nullable(),
  appreciationBps: z.number().int().nullable(),
  coverageState: intelligenceDataStateSchema,
  sourceType: intelligenceSourceTypeSchema,
  observedAt: z.string().datetime(),
  effectiveAt: z.string().datetime().nullable(),
  confidenceBps: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});
export type MarketSnapshotSummary = z.infer<typeof marketSnapshotSummarySchema>;

export const marketQuerySchema = cursorPaginationQuerySchema.extend({
  city: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(120).optional(),
  microMarket: z.string().trim().max(120).optional(),
  subjectType: intelligenceSubjectTypeSchema.optional(),
  subjectKey: z.string().trim().max(160).optional(),
  propertyPublicId: z
    .string()
    .regex(/^PS-PROP-\d+$/)
    .optional(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional(),
});
export type MarketQuery = z.infer<typeof marketQuerySchema>;

export const marketSnapshotListResponseSchema = z.object({
  snapshots: z.array(marketSnapshotSummarySchema),
  coverageState: intelligenceDataStateSchema,
  nextCursor: z.string().nullable(),
});
export type MarketSnapshotListResponse = z.infer<typeof marketSnapshotListResponseSchema>;

export const marketTrendPointSchema = z.object({
  observedAt: z.string().datetime(),
  medianPriceMinor: z.string().nullable(),
  medianPricePerSqftMinor: z.string().nullable(),
  coverageState: intelligenceDataStateSchema,
});
export type MarketTrendPoint = z.infer<typeof marketTrendPointSchema>;

export const marketTrendResponseSchema = z.object({
  points: z.array(marketTrendPointSchema),
  coverageState: intelligenceDataStateSchema,
  city: z.string().nullable(),
  locality: z.string().nullable(),
  microMarket: z.string().nullable(),
});
export type MarketTrendResponse = z.infer<typeof marketTrendResponseSchema>;

export const infrastructureAssetSummarySchema = z.object({
  publicId: z.string(),
  name: z.string(),
  category: infrastructureCategorySchema,
  status: infrastructureStatusSchema,
  city: z.string().nullable(),
  locality: z.string().nullable(),
  addressLine: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  expectedAt: z.string().nullable(),
  actualAt: z.string().nullable(),
  sourceType: intelligenceSourceTypeSchema,
  confidenceBps: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});
export type InfrastructureAssetSummary = z.infer<typeof infrastructureAssetSummarySchema>;

export const infrastructureQuerySchema = cursorPaginationQuerySchema.extend({
  city: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(120).optional(),
  category: infrastructureCategorySchema.optional(),
  status: infrastructureStatusSchema.optional(),
});
export type InfrastructureQuery = z.infer<typeof infrastructureQuerySchema>;

export const infrastructureListResponseSchema = z.object({
  assets: z.array(infrastructureAssetSummarySchema),
  coverageState: intelligenceDataStateSchema,
  nextCursor: z.string().nullable(),
});
export type InfrastructureListResponse = z.infer<typeof infrastructureListResponseSchema>;

export const intelligenceObservationSummarySchema = z.object({
  publicId: z.string(),
  subjectType: intelligenceSubjectTypeSchema,
  subjectKey: z.string(),
  observationKey: z.string(),
  valueJson: z.unknown(),
  coverageState: intelligenceDataStateSchema,
  sourceType: intelligenceSourceTypeSchema,
  observedAt: z.string().datetime(),
  confidenceBps: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});
export type IntelligenceObservationSummary = z.infer<typeof intelligenceObservationSummarySchema>;

export const intelligenceObservationListQuerySchema = cursorPaginationQuerySchema.extend({
  subjectType: intelligenceSubjectTypeSchema.optional(),
  subjectKey: z.string().trim().max(160).optional(),
  observationKey: z.string().trim().max(120).optional(),
});
export type IntelligenceObservationListQuery = z.infer<
  typeof intelligenceObservationListQuerySchema
>;

export const intelligenceObservationListResponseSchema = z.object({
  observations: z.array(intelligenceObservationSummarySchema),
  coverageState: intelligenceDataStateSchema,
  nextCursor: z.string().nullable(),
});
export type IntelligenceObservationListResponse = z.infer<
  typeof intelligenceObservationListResponseSchema
>;

export const propertyIntelligenceDetailSchema = z.object({
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
  pricePerSqftMinor: z.string().nullable(),
  currency: z.string(),
  availabilityStatus: propertyAvailabilityStatusSchema,
  publicationStatus: propertyPublicationStatusSchema,
  city: z.string().nullable(),
  locality: z.string().nullable(),
  carpetAreaSqft: z.number().nullable(),
  builtUpAreaSqft: z.number().nullable(),
  trustStatus: trustSubjectStatusSchema,
  trustScore: trustScoreResponseSchema.nullable(),
  market: marketSnapshotSummarySchema.nullable(),
  marketCoverageState: intelligenceDataStateSchema,
  infrastructure: z.array(infrastructureAssetSummarySchema).default([]),
  infrastructureCoverageState: intelligenceDataStateSchema,
  coverageState: intelligenceDataStateSchema,
  disclaimer: z.string(),
});
export type PropertyIntelligenceDetail = z.infer<typeof propertyIntelligenceDetailSchema>;

export const projectIntelligenceDetailSchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  name: z.string(),
  projectType: projectTypeSchema,
  lifecycleStatus: projectLifecycleStatusSchema,
  city: z.string().nullable(),
  locality: z.string().nullable(),
  microMarket: z.string().nullable(),
  startingPriceMinor: z.string().nullable(),
  currency: z.string(),
  trustStatus: trustSubjectStatusSchema,
  trustScore: trustScoreResponseSchema.nullable(),
  market: marketSnapshotSummarySchema.nullable(),
  marketCoverageState: intelligenceDataStateSchema,
  infrastructure: z.array(infrastructureAssetSummarySchema).default([]),
  infrastructureCoverageState: intelligenceDataStateSchema,
  coverageState: intelligenceDataStateSchema,
  disclaimer: z.string(),
});
export type ProjectIntelligenceDetail = z.infer<typeof projectIntelligenceDetailSchema>;

export const intelligenceCompareSubjectTypeSchema = z.enum(['PROPERTY', 'PROJECT']);
export type IntelligenceCompareSubjectType = z.infer<typeof intelligenceCompareSubjectTypeSchema>;

export const intelligenceCompareRequestSchema = z.object({
  subjectType: intelligenceCompareSubjectTypeSchema.default('PROPERTY'),
  publicIds: z
    .array(z.string().regex(/^PS-(PROP|PROJ)-\d+$/))
    .min(2)
    .max(5),
});
export type IntelligenceCompareRequest = z.infer<typeof intelligenceCompareRequestSchema>;

export const intelligenceCompareFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  values: z.array(
    z.object({
      publicId: z.string(),
      value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      available: z.boolean(),
    }),
  ),
});
export type IntelligenceCompareField = z.infer<typeof intelligenceCompareFieldSchema>;

export const intelligenceCompareResponseSchema = z.object({
  subjectType: intelligenceCompareSubjectTypeSchema,
  subjects: z.array(
    z.object({
      publicId: z.string(),
      title: z.string(),
      coverageState: intelligenceDataStateSchema,
    }),
  ),
  fields: z.array(intelligenceCompareFieldSchema),
  coverageState: intelligenceDataStateSchema,
  disclaimer: z.string(),
});
export type IntelligenceCompareResponse = z.infer<typeof intelligenceCompareResponseSchema>;

export const intelligenceMatchCriteriaSchema = z.object({
  propertyType: propertyTypeSchema.optional(),
  transactionType: requirementTransactionTypeSchema.optional(),
  configuration: propertyConfigurationSchema.optional().nullable(),
  bedrooms: z.number().int().min(0).max(50).optional().nullable(),
  budgetMinMinor: optionalMoneyMinorSchema,
  budgetMaxMinor: optionalMoneyMinorSchema,
  city: z.string().trim().min(2).max(80).optional(),
  locality: z.string().trim().max(120).optional().nullable(),
  microMarket: z.string().trim().max(120).optional().nullable(),
  amenities: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
});
export type IntelligenceMatchCriteria = z.infer<typeof intelligenceMatchCriteriaSchema>;

export const intelligenceMatchRequestSchema = z.object({
  requirementPublicId: z
    .string()
    .regex(/^PS-REQ-\d+$/)
    .optional(),
  criteria: intelligenceMatchCriteriaSchema.optional(),
  limit: z.number().int().min(1).max(50).default(10),
});
export type IntelligenceMatchRequest = z.infer<typeof intelligenceMatchRequestSchema>;

export const intelligenceMatchItemSchema = z.object({
  propertyPublicId: z.string(),
  title: z.string(),
  city: z.string().nullable(),
  locality: z.string().nullable(),
  priceMinor: z.string(),
  currency: z.string(),
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()),
  unmatched: z.array(z.string()),
});
export type IntelligenceMatchItem = z.infer<typeof intelligenceMatchItemSchema>;

export const intelligenceMatchResponseSchema = z.object({
  matches: z.array(intelligenceMatchItemSchema),
  coverageState: intelligenceDataStateSchema,
  disclaimer: z.string(),
});
export type IntelligenceMatchResponse = z.infer<typeof intelligenceMatchResponseSchema>;

export const aiJobSummarySchema = z.object({
  publicId: z.string(),
  type: aiJobTypeSchema,
  status: aiJobStatusSchema,
  provider: z.string(),
  coverageState: intelligenceDataStateSchema,
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AiJobSummary = z.infer<typeof aiJobSummarySchema>;

export const aiAssistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
  contextPropertyPublicIds: z
    .array(z.string().regex(/^PS-PROP-\d+$/))
    .max(5)
    .default([]),
  contextProjectPublicIds: z
    .array(z.string().regex(/^PS-PROJ-\d+$/))
    .max(5)
    .default([]),
});
export type AiAssistantRequest = z.infer<typeof aiAssistantRequestSchema>;

export const aiReferenceSchema = z.object({
  kind: z.enum(['PROPERTY', 'PROJECT', 'MARKET', 'INFRASTRUCTURE', 'REVIEW', 'TOOL']),
  publicId: z.string().nullable(),
  label: z.string(),
});
export type AiReference = z.infer<typeof aiReferenceSchema>;

export const aiAssistantResponseSchema = z.object({
  job: aiJobSummarySchema,
  answer: z.string(),
  references: z.array(aiReferenceSchema).default([]),
  coverageState: intelligenceDataStateSchema,
  disclaimer: z.string(),
});
export type AiAssistantResponse = z.infer<typeof aiAssistantResponseSchema>;

export const aiPropertyMatchRequestSchema = intelligenceMatchRequestSchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
});
export type AiPropertyMatchRequest = z.infer<typeof aiPropertyMatchRequestSchema>;

export const aiPropertyMatchResponseSchema = z.object({
  job: aiJobSummarySchema,
  matches: z.array(intelligenceMatchItemSchema),
  coverageState: intelligenceDataStateSchema,
  disclaimer: z.string(),
});
export type AiPropertyMatchResponse = z.infer<typeof aiPropertyMatchResponseSchema>;

export const aiDocumentAnalysisRequestSchema = z.object({
  documentPublicId: z.string().regex(/^PS-DOC-\d+$/),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
});
export type AiDocumentAnalysisRequest = z.infer<typeof aiDocumentAnalysisRequestSchema>;

export const documentAnalysisFindingSchema = z.object({
  kind: documentAnalysisFindingKindSchema,
  field: z.string().nullable(),
  value: z.string().nullable(),
  confidenceBps: z.number().int().nullable(),
  note: z.string().nullable(),
});
export type DocumentAnalysisFinding = z.infer<typeof documentAnalysisFindingSchema>;

export const aiDocumentAnalysisResponseSchema = z.object({
  job: aiJobSummarySchema,
  analysisPublicId: z.string(),
  status: aiJobStatusSchema,
  findings: z.array(documentAnalysisFindingSchema).default([]),
  warnings: z.array(z.string()).default([]),
  coverageState: intelligenceDataStateSchema,
  disclaimer: z.string(),
});
export type AiDocumentAnalysisResponse = z.infer<typeof aiDocumentAnalysisResponseSchema>;

export const aiFloorPlanAnalysisRequestSchema = z.object({
  documentPublicId: z
    .string()
    .regex(/^PS-DOC-\d+$/)
    .optional()
    .nullable(),
  propertyPublicId: z
    .string()
    .regex(/^PS-PROP-\d+$/)
    .optional()
    .nullable(),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
});
export type AiFloorPlanAnalysisRequest = z.infer<typeof aiFloorPlanAnalysisRequestSchema>;

export const aiFloorPlanAnalysisResponseSchema = z.object({
  job: aiJobSummarySchema,
  analysisPublicId: z.string(),
  status: aiJobStatusSchema,
  observations: z.array(z.string()).default([]),
  uncertaintyNotes: z.string().nullable(),
  coverageState: intelligenceDataStateSchema,
  disclaimer: z.string(),
});
export type AiFloorPlanAnalysisResponse = z.infer<typeof aiFloorPlanAnalysisResponseSchema>;

export const aiValuationRequestSchema = z.object({
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
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
});
export type AiValuationRequest = z.infer<typeof aiValuationRequestSchema>;

export const aiValuationResponseSchema = z.object({
  job: aiJobSummarySchema,
  valuationPublicId: z.string(),
  coverageState: intelligenceDataStateSchema,
  lowEstimateMinor: z.string().nullable(),
  highEstimateMinor: z.string().nullable(),
  midpointMinor: z.string().nullable(),
  currency: z.string(),
  confidenceBps: z.number().int().nullable(),
  factors: z.array(z.string()).default([]),
  disclaimer: z.string(),
});
export type AiValuationResponse = z.infer<typeof aiValuationResponseSchema>;

export const aiPropertySearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type AiPropertySearchRequest = z.infer<typeof aiPropertySearchRequestSchema>;

export const aiPropertySearchParsedSchema = z.object({
  city: z.string().nullable(),
  locality: z.string().nullable(),
  bedrooms: z.number().int().nullable(),
  configuration: propertyConfigurationSchema.nullable(),
  propertyType: propertyTypeSchema.nullable(),
  budgetMinMinor: z.string().nullable(),
  budgetMaxMinor: z.string().nullable(),
  amenities: z.array(z.string()).default([]),
});
export type AiPropertySearchParsed = z.infer<typeof aiPropertySearchParsedSchema>;

export const aiPropertySearchResponseSchema = z.object({
  job: aiJobSummarySchema,
  parsed: aiPropertySearchParsedSchema,
  properties: z.array(
    z.object({
      publicId: z.string(),
      title: z.string(),
      city: z.string().nullable(),
      locality: z.string().nullable(),
      bedrooms: z.number().nullable(),
      configuration: propertyConfigurationSchema.nullable(),
      priceMinor: z.string(),
      currency: z.string(),
    }),
  ),
  coverageState: intelligenceDataStateSchema,
  disclaimer: z.string(),
});
export type AiPropertySearchResponse = z.infer<typeof aiPropertySearchResponseSchema>;

// --- Phase 12: Media CMS, editorial, collections, analytics, providers, Broadcast Studio ---

export const seoMetadataSchema = z.object({
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  canonicalPath: z.string().nullable(),
  ogTitle: z.string().nullable(),
  ogDescription: z.string().nullable(),
  twitterTitle: z.string().nullable(),
  twitterDescription: z.string().nullable(),
  indexable: z.boolean(),
});
export type SeoMetadata = z.infer<typeof seoMetadataSchema>;

export const mediaCmsDetailSchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string().nullable(),
  mediaType: mediaTypeSchema,
  mimeType: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  caption: z.string().nullable(),
  altText: z.string().nullable(),
  slug: z.string().nullable(),
  durationSeconds: z.number().int().nullable(),
  widthPx: z.number().int().nullable(),
  heightPx: z.number().int().nullable(),
  source: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  lifecycleStatus: mediaLifecycleStatusSchema,
  moderationStatus: mediaModerationStatusSchema,
  visibility: assetVisibilitySchema,
  category: z.string().nullable(),
  tags: z.array(z.string()),
  publishedAt: z.string().datetime().nullable(),
  authorPublicId: z.string().nullable(),
  authorDisplayName: z.string().nullable(),
  entityType: catalogEntityTypeSchema.nullable(),
  entityPublicId: z.string().nullable(),
  sortOrder: z.number().int(),
  seo: seoMetadataSchema,
  accessUrlAvailable: z.boolean(),
});
export type MediaCmsDetail = z.infer<typeof mediaCmsDetailSchema>;

export const mediaCmsListQuerySchema = cursorPaginationQuerySchema.extend({
  mediaType: mediaTypeSchema.optional(),
  category: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(80).optional(),
  lifecycleStatus: mediaLifecycleStatusSchema.optional(),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
});
export type MediaCmsListQuery = z.infer<typeof mediaCmsListQuerySchema>;

export const mediaCmsListResponseSchema = z.object({
  media: z.array(mediaCmsDetailSchema),
  nextCursor: z.string().nullable(),
});
export type MediaCmsListResponse = z.infer<typeof mediaCmsListResponseSchema>;

export const createMediaCmsRequestSchema = z.object({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
  entityType: catalogEntityTypeSchema.optional().nullable(),
  entityPublicId: z
    .string()
    .regex(/^PS-(PROJ|PROP|COM)-\d+$/)
    .optional()
    .nullable(),
  storageKey: z.string().trim().min(1).max(512),
  mimeType: z.string().trim().min(3).max(120),
  mediaType: mediaTypeSchema,
  fileSizeBytes: moneyMinorSchema,
  sortOrder: z.number().int().min(0).default(0),
  title: z.string().trim().min(1).max(200).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  caption: z.string().trim().max(500).optional().nullable(),
  altText: z.string().trim().max(240).optional().nullable(),
  slug: slugSchema.optional().nullable(),
  durationSeconds: z.number().int().min(0).optional().nullable(),
  widthPx: z.number().int().min(0).optional().nullable(),
  heightPx: z.number().int().min(0).optional().nullable(),
  thumbnailStorageKey: z.string().trim().max(512).optional().nullable(),
  posterStorageKey: z.string().trim().max(512).optional().nullable(),
  source: z.string().trim().max(80).optional().nullable(),
  sourceUrl: z.string().trim().url().max(1000).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  tags: z.array(z.string().trim().max(80)).max(40).default([]),
  visibility: assetVisibilitySchema.default('PRIVATE'),
  seoTitle: z.string().trim().max(200).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
  canonicalPath: z.string().trim().max(320).optional().nullable(),
  ogTitle: z.string().trim().max(200).optional().nullable(),
  ogDescription: z.string().trim().max(320).optional().nullable(),
  twitterTitle: z.string().trim().max(200).optional().nullable(),
  twitterDescription: z.string().trim().max(320).optional().nullable(),
});
export type CreateMediaCmsRequest = z.infer<typeof createMediaCmsRequestSchema>;

export const updateMediaCmsRequestSchema = createMediaCmsRequestSchema
  .omit({ storageKey: true, mimeType: true, mediaType: true, fileSizeBytes: true })
  .partial();
export type UpdateMediaCmsRequest = z.infer<typeof updateMediaCmsRequestSchema>;

export const moderateMediaRequestSchema = z.object({
  moderationStatus: mediaModerationStatusSchema,
  reason: z.string().trim().max(1000).optional().nullable(),
});
export type ModerateMediaRequest = z.infer<typeof moderateMediaRequestSchema>;

export const mediaAccessUrlResponseSchema = z.object({
  publicId: z.string(),
  url: z.string(),
  expiresAt: z.string().datetime(),
});
export type MediaAccessUrlResponse = z.infer<typeof mediaAccessUrlResponseSchema>;

export const creatorProfileSummarySchema = z.object({
  publicId: z.string(),
  userPublicId: z.string(),
  organizationPublicId: z.string().nullable(),
  displayName: z.string(),
  bio: z.string().nullable(),
  headline: z.string().nullable(),
  isActive: z.boolean(),
});
export type CreatorProfileSummary = z.infer<typeof creatorProfileSummarySchema>;

export const createCreatorProfileRequestSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(1000).optional().nullable(),
  headline: z.string().trim().max(200).optional().nullable(),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
});
export type CreateCreatorProfileRequest = z.infer<typeof createCreatorProfileRequestSchema>;

export const editorialContentSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string().nullable(),
  kind: editorialContentKindSchema,
  status: editorialContentStatusSchema,
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),
  featured: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
  authorPublicId: z.string(),
  authorDisplayName: z.string().nullable(),
  coverMediaPublicId: z.string().nullable(),
  moderationStatus: mediaModerationStatusSchema,
  seo: seoMetadataSchema,
});
export type EditorialContentSummary = z.infer<typeof editorialContentSummarySchema>;

export const editorialContentDetailSchema = editorialContentSummarySchema.extend({
  bodyMarkdown: z.string(),
  relatedPropertyPublicIds: z.array(z.string()),
  relatedProjectPublicIds: z.array(z.string()),
  relatedLocalities: z.array(z.string()),
  scheduledAt: z.string().datetime().nullable(),
});
export type EditorialContentDetail = z.infer<typeof editorialContentDetailSchema>;

export const createEditorialContentRequestSchema = z.object({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
  kind: editorialContentKindSchema,
  title: z.string().trim().min(2).max(240),
  slug: slugSchema.optional(),
  excerpt: z.string().trim().max(500).optional().nullable(),
  bodyMarkdown: z.string().trim().min(1).max(200000),
  coverMediaPublicId: z
    .string()
    .regex(/^PS-MED-\d+$/)
    .optional()
    .nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  tags: z.array(z.string().trim().max(80)).max(40).default([]),
  featured: z.boolean().default(false),
  relatedPropertyPublicIds: z
    .array(z.string().regex(/^PS-PROP-\d+$/))
    .max(20)
    .default([]),
  relatedProjectPublicIds: z
    .array(z.string().regex(/^PS-PROJ-\d+$/))
    .max(20)
    .default([]),
  relatedLocalities: z.array(z.string().trim().max(120)).max(20).default([]),
  scheduledAt: z.string().datetime().optional().nullable(),
  seoTitle: z.string().trim().max(200).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
  canonicalPath: z.string().trim().max(320).optional().nullable(),
  ogTitle: z.string().trim().max(200).optional().nullable(),
  ogDescription: z.string().trim().max(320).optional().nullable(),
  twitterTitle: z.string().trim().max(200).optional().nullable(),
  twitterDescription: z.string().trim().max(320).optional().nullable(),
});
export type CreateEditorialContentRequest = z.infer<typeof createEditorialContentRequestSchema>;

export const updateEditorialContentRequestSchema = createEditorialContentRequestSchema.partial();
export type UpdateEditorialContentRequest = z.infer<typeof updateEditorialContentRequestSchema>;

export const editorialListQuerySchema = cursorPaginationQuerySchema.extend({
  kind: editorialContentKindSchema.optional(),
  status: editorialContentStatusSchema.optional(),
  category: z.string().trim().max(80).optional(),
  featured: z.coerce.boolean().optional(),
});
export type EditorialListQuery = z.infer<typeof editorialListQuerySchema>;

export const editorialListResponseSchema = z.object({
  contents: z.array(editorialContentSummarySchema),
  nextCursor: z.string().nullable(),
});
export type EditorialListResponse = z.infer<typeof editorialListResponseSchema>;

export const mediaCollectionItemSchema = z.object({
  publicId: z.string(),
  itemKind: mediaCollectionItemKindSchema,
  mediaPublicId: z.string().nullable(),
  editorialPublicId: z.string().nullable(),
  sortOrder: z.number().int(),
  title: z.string().nullable(),
});
export type MediaCollectionItem = z.infer<typeof mediaCollectionItemSchema>;

export const mediaCollectionSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string().nullable(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  coverMediaPublicId: z.string().nullable(),
  visibility: assetVisibilitySchema,
  status: mediaCollectionStatusSchema,
  publishedAt: z.string().datetime().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),
  itemCount: z.number().int(),
  seo: seoMetadataSchema,
});
export type MediaCollectionSummary = z.infer<typeof mediaCollectionSummarySchema>;

export const mediaCollectionDetailSchema = mediaCollectionSummarySchema.extend({
  items: z.array(mediaCollectionItemSchema),
});
export type MediaCollectionDetail = z.infer<typeof mediaCollectionDetailSchema>;

export const createMediaCollectionRequestSchema = z.object({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
  title: z.string().trim().min(2).max(200),
  slug: slugSchema.optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  coverMediaPublicId: z
    .string()
    .regex(/^PS-MED-\d+$/)
    .optional()
    .nullable(),
  visibility: assetVisibilitySchema.default('PRIVATE'),
  category: z.string().trim().max(80).optional().nullable(),
  tags: z.array(z.string().trim().max(80)).max(40).default([]),
  seoTitle: z.string().trim().max(200).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
});
export type CreateMediaCollectionRequest = z.infer<typeof createMediaCollectionRequestSchema>;

export const updateMediaCollectionRequestSchema = createMediaCollectionRequestSchema.partial();
export type UpdateMediaCollectionRequest = z.infer<typeof updateMediaCollectionRequestSchema>;

export const addMediaCollectionItemRequestSchema = z.object({
  itemKind: mediaCollectionItemKindSchema,
  mediaPublicId: z
    .string()
    .regex(/^PS-MED-\d+$/)
    .optional()
    .nullable(),
  editorialPublicId: z
    .string()
    .regex(/^PS-EDC-\d+$/)
    .optional()
    .nullable(),
  sortOrder: z.number().int().min(0).default(0),
});
export type AddMediaCollectionItemRequest = z.infer<typeof addMediaCollectionItemRequestSchema>;

export const mediaCollectionListResponseSchema = z.object({
  collections: z.array(mediaCollectionSummarySchema),
  nextCursor: z.string().nullable(),
});
export type MediaCollectionListResponse = z.infer<typeof mediaCollectionListResponseSchema>;

export const createMediaAnalyticsEventRequestSchema = z.object({
  eventType: mediaAnalyticsEventTypeSchema,
  mediaPublicId: z
    .string()
    .regex(/^PS-MED-\d+$/)
    .optional()
    .nullable(),
  editorialPublicId: z
    .string()
    .regex(/^PS-EDC-\d+$/)
    .optional()
    .nullable(),
  collectionPublicId: z
    .string()
    .regex(/^PS-MCOL-\d+$/)
    .optional()
    .nullable(),
  sessionKey: z.string().trim().max(64).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});
export type CreateMediaAnalyticsEventRequest = z.infer<
  typeof createMediaAnalyticsEventRequestSchema
>;

export const mediaAnalyticsEventSummarySchema = z.object({
  publicId: z.string(),
  eventType: mediaAnalyticsEventTypeSchema,
  mediaPublicId: z.string().nullable(),
  editorialPublicId: z.string().nullable(),
  collectionPublicId: z.string().nullable(),
  organizationPublicId: z.string().nullable(),
  occurredAt: z.string().datetime(),
});
export type MediaAnalyticsEventSummary = z.infer<typeof mediaAnalyticsEventSummarySchema>;

export const mediaAnalyticsListResponseSchema = z.object({
  events: z.array(mediaAnalyticsEventSummarySchema),
  nextCursor: z.string().nullable(),
});
export type MediaAnalyticsListResponse = z.infer<typeof mediaAnalyticsListResponseSchema>;

export const externalMediaProviderSummarySchema = z.object({
  provider: externalMediaProviderKindSchema,
  status: externalMediaProviderStatusSchema,
  message: z.string(),
});
export type ExternalMediaProviderSummary = z.infer<typeof externalMediaProviderSummarySchema>;

export const externalMediaProviderListResponseSchema = z.object({
  providers: z.array(externalMediaProviderSummarySchema),
});
export type ExternalMediaProviderListResponse = z.infer<
  typeof externalMediaProviderListResponseSchema
>;

export const createExternalMediaMappingRequestSchema = z.object({
  mediaPublicId: z.string().regex(/^PS-MED-\d+$/),
  provider: externalMediaProviderKindSchema,
  externalMediaId: z.string().trim().max(160).optional().nullable(),
  externalUrl: z.string().trim().url().max(1000).optional().nullable(),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
});
export type CreateExternalMediaMappingRequest = z.infer<
  typeof createExternalMediaMappingRequestSchema
>;

export const externalMediaMappingSummarySchema = z.object({
  publicId: z.string(),
  mediaPublicId: z.string(),
  provider: externalMediaProviderKindSchema,
  providerStatus: externalMediaProviderStatusSchema,
  externalMediaId: z.string().nullable(),
  externalUrl: z.string().nullable(),
  lastSyncedAt: z.string().datetime().nullable(),
});
export type ExternalMediaMappingSummary = z.infer<typeof externalMediaMappingSummarySchema>;

export const externalMediaMetricsResponseSchema = z.object({
  mappingPublicId: z.string(),
  provider: externalMediaProviderKindSchema,
  status: externalMediaProviderStatusSchema,
  metrics: z.record(z.string(), z.unknown()).nullable(),
  message: z.string(),
});
export type ExternalMediaMetricsResponse = z.infer<typeof externalMediaMetricsResponseSchema>;

export const broadcastStudioConfigSchema = z.object({
  publicId: z.string().nullable(),
  name: z.string(),
  defaultHomeRoute: z.string(),
  touchTargetMinPx: z.number().int(),
  enabledSections: z.array(z.string()),
});
export type BroadcastStudioConfig = z.infer<typeof broadcastStudioConfigSchema>;

export const updateBroadcastStudioConfigRequestSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  defaultHomeRoute: z.string().trim().max(120).optional(),
  touchTargetMinPx: z.number().int().min(44).max(120).optional(),
  enabledSections: z.array(z.string().trim().max(80)).max(40).optional(),
});
export type UpdateBroadcastStudioConfigRequest = z.infer<
  typeof updateBroadcastStudioConfigRequestSchema
>;

export const broadcastPresentationSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  available: z.boolean(),
  unavailableReason: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).nullable(),
});
export type BroadcastPresentationSection = z.infer<typeof broadcastPresentationSectionSchema>;

export const broadcastPropertyPresentationSchema = z.object({
  propertyPublicId: z.string(),
  title: z.string(),
  sections: z.array(broadcastPresentationSectionSchema),
});
export type BroadcastPropertyPresentation = z.infer<typeof broadcastPropertyPresentationSchema>;

export const broadcastProjectPresentationSchema = z.object({
  projectPublicId: z.string(),
  name: z.string(),
  sections: z.array(broadcastPresentationSectionSchema),
});
export type BroadcastProjectPresentation = z.infer<typeof broadcastProjectPresentationSchema>;

export const sitemapEntrySchema = z.object({
  path: z.string(),
  lastModified: z.string().datetime().nullable(),
  changeFrequency: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']),
  priority: z.number().min(0).max(1),
});
export type SitemapEntry = z.infer<typeof sitemapEntrySchema>;

export const publicMediaSitemapResponseSchema = z.object({
  entries: z.array(sitemapEntrySchema),
});
export type PublicMediaSitemapResponse = z.infer<typeof publicMediaSitemapResponseSchema>;

// ─── Phase 13: Partner API, Integrations & Automation ───────────────────────

export const partnerIntegrationStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']);
export type PartnerIntegrationStatus = z.infer<typeof partnerIntegrationStatusSchema>;

export const partnerIntegrationTypeSchema = z.enum([
  'PROPERTY_PORTAL',
  'BUILDER',
  'DEVELOPER',
  'AGENCY',
  'CRM_VENDOR',
  'MARKETING_PLATFORM',
  'CHANNEL_PARTNER',
  'ENTERPRISE',
  'DATA_PROVIDER',
  'OTHER',
]);
export type PartnerIntegrationType = z.infer<typeof partnerIntegrationTypeSchema>;

export const apiClientStatusSchema = z.enum(['ACTIVE', 'REVOKED', 'EXPIRED']);
export type ApiClientStatus = z.infer<typeof apiClientStatusSchema>;

export const apiClientEnvironmentSchema = z.enum(['LIVE', 'TEST']);
export type ApiClientEnvironment = z.infer<typeof apiClientEnvironmentSchema>;

export const PARTNER_API_SCOPES = [
  'properties:read',
  'projects:read',
  'inventory:read',
  'leads:receive',
  'leads:write',
  'media:read',
  'webhooks:manage',
  'analytics:read',
] as const;

export const partnerApiScopeSchema = z.enum(PARTNER_API_SCOPES);
export type PartnerApiScope = z.infer<typeof partnerApiScopeSchema>;

export const outboundWebhookStatusSchema = z.enum(['ACTIVE', 'DISABLED', 'FAILING']);
export type OutboundWebhookStatus = z.infer<typeof outboundWebhookStatusSchema>;

export const webhookDeliveryStatusSchema = z.enum([
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'DEAD_LETTER',
]);
export type WebhookDeliveryStatus = z.infer<typeof webhookDeliveryStatusSchema>;

export const domainEventTypeSchema = z.enum([
  'property.created',
  'property.updated',
  'property.published',
  'project.created',
  'project.updated',
  'project.published',
  'inventory.updated',
  'lead.created',
  'lead.assigned',
  'lead.accessed',
  'lead.status_changed',
  'requirement.created',
  'requirement.published',
  'crm.contact.created',
  'crm.follow_up.created',
  'crm.site_visit.scheduled',
  'crm.site_visit.completed',
  'crm.deal.created',
  'crm.deal.updated',
  'crm.deal.closed',
  'payment.succeeded',
  'payment.failed',
  'verification.updated',
  'review.published',
  'media.published',
  'community.update_created',
]);
export type DomainEventType = z.infer<typeof domainEventTypeSchema>;

export const integrationHealthStatusSchema = z.enum([
  'CONNECTED',
  'HEALTHY',
  'DEGRADED',
  'FAILING',
  'SUSPENDED',
  'UNAVAILABLE',
]);
export type IntegrationHealthStatus = z.infer<typeof integrationHealthStatusSchema>;

export const externalResourceTypeSchema = z.enum(['PROPERTY', 'PROJECT', 'INVENTORY']);
export type ExternalResourceType = z.infer<typeof externalResourceTypeSchema>;

export const externalMappingStatusSchema = z.enum([
  'NEW',
  'UPDATED',
  'REMOVED',
  'UNAVAILABLE',
  'CONFLICT',
]);
export type ExternalMappingStatus = z.infer<typeof externalMappingStatusSchema>;

export const automationRuleStatusSchema = z.enum(['ENABLED', 'DISABLED']);
export type AutomationRuleStatus = z.infer<typeof automationRuleStatusSchema>;

export const notificationChannelProviderKindSchema = z.enum(['EMAIL', 'SMS', 'WHATSAPP']);
export type NotificationChannelProviderKind = z.infer<typeof notificationChannelProviderKindSchema>;

export const notificationChannelProviderStatusSchema = z.enum([
  'CONFIGURED',
  'UNAVAILABLE',
  'DISABLED',
]);
export type NotificationChannelProviderStatus = z.infer<
  typeof notificationChannelProviderStatusSchema
>;

export const deadLetterStatusSchema = z.enum(['OPEN', 'RETRIED', 'DISCARDED']);
export type DeadLetterStatus = z.infer<typeof deadLetterStatusSchema>;

export const createPartnerIntegrationRequestSchema = z.object({
  name: z.string().trim().min(2).max(160),
  integrationType: partnerIntegrationTypeSchema,
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});
export type CreatePartnerIntegrationRequest = z.infer<typeof createPartnerIntegrationRequestSchema>;

export const updatePartnerIntegrationRequestSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  status: partnerIntegrationStatusSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});
export type UpdatePartnerIntegrationRequest = z.infer<typeof updatePartnerIntegrationRequestSchema>;

export const partnerIntegrationSummarySchema = z.object({
  publicId: z.string(),
  organizationPublicId: z.string(),
  name: z.string(),
  integrationType: partnerIntegrationTypeSchema,
  status: partnerIntegrationStatusSchema,
  healthStatus: integrationHealthStatusSchema,
  lastSuccessfulAt: z.string().datetime().nullable(),
  lastFailedAt: z.string().datetime().nullable(),
  errorCount: z.number().int(),
  createdAt: z.string().datetime(),
});
export type PartnerIntegrationSummary = z.infer<typeof partnerIntegrationSummarySchema>;

export const partnerIntegrationListResponseSchema = z.object({
  items: z.array(partnerIntegrationSummarySchema),
  nextCursor: z.string().nullable(),
});
export type PartnerIntegrationListResponse = z.infer<typeof partnerIntegrationListResponseSchema>;

export const createApiClientRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  environment: apiClientEnvironmentSchema.default('LIVE'),
  scopes: z.array(partnerApiScopeSchema).min(1).max(20),
  expiresAt: z.string().datetime().optional().nullable(),
});
export type CreateApiClientRequest = z.infer<typeof createApiClientRequestSchema>;

export const apiClientSummarySchema = z.object({
  publicId: z.string(),
  name: z.string(),
  environment: apiClientEnvironmentSchema,
  keyPrefix: z.string(),
  scopes: z.array(partnerApiScopeSchema),
  status: apiClientStatusSchema,
  expiresAt: z.string().datetime().nullable(),
  lastUsedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type ApiClientSummary = z.infer<typeof apiClientSummarySchema>;

export const createApiClientResponseSchema = apiClientSummarySchema.extend({
  secret: z.string().min(20),
});
export type CreateApiClientResponse = z.infer<typeof createApiClientResponseSchema>;

export const apiClientListResponseSchema = z.object({
  items: z.array(apiClientSummarySchema),
});
export type ApiClientListResponse = z.infer<typeof apiClientListResponseSchema>;

export const createWebhookEndpointRequestSchema = z.object({
  url: z.string().url().max(1000),
  description: z.string().trim().max(240).optional().nullable(),
  subscribedEvents: z.array(domainEventTypeSchema).min(1).max(40),
});
export type CreateWebhookEndpointRequest = z.infer<typeof createWebhookEndpointRequestSchema>;

export const webhookEndpointSummarySchema = z.object({
  publicId: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  secretPrefix: z.string(),
  subscribedEvents: z.array(domainEventTypeSchema),
  status: outboundWebhookStatusSchema,
  maxAttempts: z.number().int(),
  lastSuccessAt: z.string().datetime().nullable(),
  lastFailureAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type WebhookEndpointSummary = z.infer<typeof webhookEndpointSummarySchema>;

export const createWebhookEndpointResponseSchema = webhookEndpointSummarySchema.extend({
  secret: z.string().min(20),
});
export type CreateWebhookEndpointResponse = z.infer<typeof createWebhookEndpointResponseSchema>;

export const webhookEndpointListResponseSchema = z.object({
  items: z.array(webhookEndpointSummarySchema),
});
export type WebhookEndpointListResponse = z.infer<typeof webhookEndpointListResponseSchema>;

export const webhookDeliverySummarySchema = z.object({
  publicId: z.string(),
  endpointPublicId: z.string(),
  eventPublicId: z.string(),
  eventType: z.string(),
  status: webhookDeliveryStatusSchema,
  attemptCount: z.number().int(),
  responseStatus: z.number().int().nullable(),
  lastError: z.string().nullable(),
  nextRetryAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type WebhookDeliverySummary = z.infer<typeof webhookDeliverySummarySchema>;

export const webhookDeliveryListResponseSchema = z.object({
  items: z.array(webhookDeliverySummarySchema),
  nextCursor: z.string().nullable(),
});
export type WebhookDeliveryListResponse = z.infer<typeof webhookDeliveryListResponseSchema>;

export const domainEventPayloadSchema = z.object({
  eventId: z.string(),
  eventType: domainEventTypeSchema,
  timestamp: z.string().datetime(),
  apiVersion: z.string(),
  resourceType: z.string(),
  resourcePublicId: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
});
export type DomainEventPayload = z.infer<typeof domainEventPayloadSchema>;

export const deadLetterEventSummarySchema = z.object({
  publicId: z.string(),
  sourceType: z.string(),
  sourceId: z.string(),
  destination: z.string(),
  failureReason: z.string(),
  attemptCount: z.number().int(),
  lastResponse: z.string().nullable(),
  status: deadLetterStatusSchema,
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
});
export type DeadLetterEventSummary = z.infer<typeof deadLetterEventSummarySchema>;

export const deadLetterEventListResponseSchema = z.object({
  items: z.array(deadLetterEventSummarySchema),
  nextCursor: z.string().nullable(),
});
export type DeadLetterEventListResponse = z.infer<typeof deadLetterEventListResponseSchema>;

export const integrationUsageEventSummarySchema = z.object({
  publicId: z.string(),
  apiClientPublicId: z.string().nullable(),
  endpointCategory: z.string(),
  httpMethod: z.string(),
  path: z.string(),
  statusCode: z.number().int(),
  responseTimeMs: z.number().int(),
  rateLimited: z.boolean(),
  resourceType: z.string().nullable(),
  resourcePublicId: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type IntegrationUsageEventSummary = z.infer<typeof integrationUsageEventSummarySchema>;

export const integrationUsageListResponseSchema = z.object({
  items: z.array(integrationUsageEventSummarySchema),
  nextCursor: z.string().nullable(),
});
export type IntegrationUsageListResponse = z.infer<typeof integrationUsageListResponseSchema>;

export const createAutomationRuleRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  triggerEvent: z.string().trim().min(2).max(80),
  actionType: z.enum(['CREATE_FOLLOW_UP', 'SEND_NOTIFICATION', 'NOOP']),
  actionConfig: z.record(z.string(), z.unknown()).default({}),
});
export type CreateAutomationRuleRequest = z.infer<typeof createAutomationRuleRequestSchema>;

export const automationRuleSummarySchema = z.object({
  publicId: z.string(),
  name: z.string(),
  triggerEvent: z.string(),
  actionType: z.string(),
  actionConfig: z.record(z.string(), z.unknown()),
  status: automationRuleStatusSchema,
  createdAt: z.string().datetime(),
});
export type AutomationRuleSummary = z.infer<typeof automationRuleSummarySchema>;

export const automationRuleListResponseSchema = z.object({
  items: z.array(automationRuleSummarySchema),
});
export type AutomationRuleListResponse = z.infer<typeof automationRuleListResponseSchema>;

export const externalResourceMappingSummarySchema = z.object({
  publicId: z.string(),
  provider: z.string(),
  resourceType: externalResourceTypeSchema,
  externalId: z.string(),
  canonicalPublicId: z.string().nullable(),
  status: externalMappingStatusSchema,
  conflictReason: z.string().nullable(),
  lastSyncedAt: z.string().datetime().nullable(),
});
export type ExternalResourceMappingSummary = z.infer<typeof externalResourceMappingSummarySchema>;

export const upsertExternalResourceMappingRequestSchema = z.object({
  provider: z.string().trim().min(2).max(80),
  resourceType: externalResourceTypeSchema,
  externalId: z.string().trim().min(1).max(160),
  canonicalPublicId: z.string().trim().max(32).optional().nullable(),
  status: externalMappingStatusSchema.optional(),
  conflictReason: z.string().trim().max(500).optional().nullable(),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
});
export type UpsertExternalResourceMappingRequest = z.infer<
  typeof upsertExternalResourceMappingRequestSchema
>;

export const notificationProviderSummarySchema = z.object({
  kind: notificationChannelProviderKindSchema,
  status: notificationChannelProviderStatusSchema,
  message: z.string(),
});
export type NotificationProviderSummary = z.infer<typeof notificationProviderSummarySchema>;

export const notificationProviderListResponseSchema = z.object({
  providers: z.array(notificationProviderSummarySchema),
});
export type NotificationProviderListResponse = z.infer<
  typeof notificationProviderListResponseSchema
>;

export const partnerPropertySummarySchema = z.object({
  publicId: z.string(),
  title: z.string(),
  publicationStatus: z.string(),
  city: z.string().nullable(),
  organizationPublicId: z.string(),
});
export type PartnerPropertySummary = z.infer<typeof partnerPropertySummarySchema>;

export const partnerPropertyListResponseSchema = z.object({
  items: z.array(partnerPropertySummarySchema),
  nextCursor: z.string().nullable(),
});
export type PartnerPropertyListResponse = z.infer<typeof partnerPropertyListResponseSchema>;

export const partnerProjectSummarySchema = z.object({
  publicId: z.string(),
  name: z.string(),
  lifecycleStatus: z.string(),
  city: z.string().nullable(),
  organizationPublicId: z.string(),
});
export type PartnerProjectSummary = z.infer<typeof partnerProjectSummarySchema>;

export const partnerProjectListResponseSchema = z.object({
  items: z.array(partnerProjectSummarySchema),
  nextCursor: z.string().nullable(),
});
export type PartnerProjectListResponse = z.infer<typeof partnerProjectListResponseSchema>;

export const partnerLeadSummarySchema = z.object({
  publicId: z.string(),
  status: z.string(),
  entitled: z.boolean(),
  contactRevealed: z.boolean(),
  contact: z
    .object({
      name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })
    .nullable(),
});
export type PartnerLeadSummary = z.infer<typeof partnerLeadSummarySchema>;

export const partnerLeadListResponseSchema = z.object({
  items: z.array(partnerLeadSummarySchema),
  nextCursor: z.string().nullable(),
});
export type PartnerLeadListResponse = z.infer<typeof partnerLeadListResponseSchema>;

export const integrationsOverviewResponseSchema = z.object({
  integrations: z.array(partnerIntegrationSummarySchema),
  apiClients: z.array(apiClientSummarySchema),
  webhooks: z.array(webhookEndpointSummarySchema),
  recentDeliveries: z.array(webhookDeliverySummarySchema),
  failedDeliveries: z.array(webhookDeliverySummarySchema),
  notificationProviders: z.array(notificationProviderSummarySchema),
});
export type IntegrationsOverviewResponse = z.infer<typeof integrationsOverviewResponseSchema>;

export const partnerApiDocsResponseSchema = z.object({
  version: z.string(),
  authentication: z.string(),
  scopes: z.array(partnerApiScopeSchema),
  rateLimits: z.object({
    windowMs: z.number().int(),
    maxRequests: z.number().int(),
  }),
  webhookSigning: z.object({
    algorithm: z.literal('HMAC-SHA256'),
    headers: z.array(z.string()),
    replayToleranceSeconds: z.number().int(),
  }),
  idempotency: z.string(),
  resources: z.array(z.string()),
});
export type PartnerApiDocsResponse = z.infer<typeof partnerApiDocsResponseSchema>;

export const verifyWebhookSignatureRequestSchema = z.object({
  secret: z.string().min(8),
  timestamp: z.string().min(1),
  eventId: z.string().min(1),
  body: z.string().min(1),
  signature: z.string().min(1),
});
export type VerifyWebhookSignatureRequest = z.infer<typeof verifyWebhookSignatureRequestSchema>;

export const verifyWebhookSignatureResponseSchema = z.object({
  valid: z.boolean(),
  reason: z.string().nullable(),
});
export type VerifyWebhookSignatureResponse = z.infer<typeof verifyWebhookSignatureResponseSchema>;

// ─── Phase 13 patch: AI Chatbot / Copilot ───────────────────────────────────

export const aiConversationStatusSchema = z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']);
export type AiConversationStatus = z.infer<typeof aiConversationStatusSchema>;

export const aiChatMessageRoleSchema = z.enum(['USER', 'ASSISTANT', 'SYSTEM', 'TOOL']);
export type AiChatMessageRole = z.infer<typeof aiChatMessageRoleSchema>;

export const aiChatCardKindSchema = z.enum([
  'PROPERTY',
  'PROJECT',
  'COMPARISON',
  'MARKET',
  'INFRASTRUCTURE',
  'REQUIREMENT_CONFIRMATION',
  'CALCULATION',
  'NEXT_ACTION',
  'GENERIC',
]);
export type AiChatCardKind = z.infer<typeof aiChatCardKindSchema>;

export const aiChatResultCardSchema = z.object({
  kind: aiChatCardKindSchema,
  publicId: z.string().nullable(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  configuration: z.string().nullable().optional(),
  priceMinor: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  areaLabel: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  developer: z.string().nullable().optional(),
  trustStatus: z.string().nullable().optional(),
  availability: z.string().nullable().optional(),
  primaryMediaUrl: z.string().nullable().optional(),
  matchScore: z.number().nullable().optional(),
  href: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type AiChatResultCard = z.infer<typeof aiChatResultCardSchema>;

export const aiChatToolInvocationSchema = z.object({
  tool: z.string(),
  ok: z.boolean(),
  coverageState: intelligenceDataStateSchema,
  summary: z.string().nullable().optional(),
});
export type AiChatToolInvocation = z.infer<typeof aiChatToolInvocationSchema>;

/** Route/resource hints only — never treated as authorization proof. */
export const aiConversationContextHintsSchema = z.object({
  route: z.string().trim().max(200).optional().nullable(),
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
  requirementPublicId: z
    .string()
    .regex(/^PS-REQ-\d+$/)
    .optional()
    .nullable(),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
  focus: z
    .enum([
      'general',
      'saved_properties',
      'saved_searches',
      'pipeline',
      'follow_ups',
      'requirement',
      'property',
      'project',
    ])
    .optional()
    .nullable(),
});
export type AiConversationContextHints = z.infer<typeof aiConversationContextHintsSchema>;

export const createAiConversationRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional().nullable(),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional()
    .nullable(),
  contextHints: aiConversationContextHintsSchema.optional().nullable(),
});
export type CreateAiConversationRequest = z.infer<typeof createAiConversationRequestSchema>;

export const aiConversationSummarySchema = z.object({
  publicId: z.string(),
  title: z.string().nullable(),
  status: aiConversationStatusSchema,
  organizationPublicId: z.string().nullable(),
  contextHints: aiConversationContextHintsSchema.nullable().optional(),
  lastMessageAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AiConversationSummary = z.infer<typeof aiConversationSummarySchema>;

export const aiConversationListResponseSchema = z.object({
  items: z.array(aiConversationSummarySchema),
  nextCursor: z.string().nullable(),
});
export type AiConversationListResponse = z.infer<typeof aiConversationListResponseSchema>;

export const aiConversationMessageSchema = z.object({
  publicId: z.string(),
  role: aiChatMessageRoleSchema,
  content: z.string(),
  coverageState: intelligenceDataStateSchema.nullable(),
  cards: z.array(aiChatResultCardSchema).default([]),
  references: z.array(aiReferenceSchema).default([]),
  toolInvocations: z.array(aiChatToolInvocationSchema).default([]),
  pendingRequirement: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string().datetime(),
});
export type AiConversationMessage = z.infer<typeof aiConversationMessageSchema>;

export const aiConversationDetailSchema = aiConversationSummarySchema.extend({
  messages: z.array(aiConversationMessageSchema),
  pendingRequirement: z.record(z.string(), z.unknown()).nullable(),
  disclaimer: z.string(),
});
export type AiConversationDetail = z.infer<typeof aiConversationDetailSchema>;

export const postAiConversationMessageRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  confirmRequirement: z.boolean().optional().default(false),
  clickedPropertyPublicId: z
    .string()
    .regex(/^PS-PROP-\d+$/)
    .optional()
    .nullable(),
  contextHints: aiConversationContextHintsSchema.optional().nullable(),
});
export type PostAiConversationMessageRequest = z.infer<
  typeof postAiConversationMessageRequestSchema
>;

export const postAiConversationMessageResponseSchema = z.object({
  conversation: aiConversationSummarySchema,
  userMessage: aiConversationMessageSchema,
  assistantMessage: aiConversationMessageSchema,
  disclaimer: z.string(),
});
export type PostAiConversationMessageResponse = z.infer<
  typeof postAiConversationMessageResponseSchema
>;

export const okAiConversationDeleteResponseSchema = z.object({
  ok: z.literal(true),
  publicId: z.string(),
});
export type OkAiConversationDeleteResponse = z.infer<typeof okAiConversationDeleteResponseSchema>;

// ─── Phase 14A: Unified dashboards & workflow orchestration ─────────────────

export const dashboardMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number().int().nonnegative(),
  href: z.string().nullable().optional(),
});
export type DashboardMetric = z.infer<typeof dashboardMetricSchema>;

export const dashboardPipelineStageSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
});
export type DashboardPipelineStage = z.infer<typeof dashboardPipelineStageSchema>;

export const dashboardActivityItemSchema = z.object({
  id: z.string(),
  action: z.string(),
  resourceType: z.string().nullable(),
  resourcePublicId: z.string().nullable(),
  summary: z.string(),
  occurredAt: z.string().datetime(),
});
export type DashboardActivityItem = z.infer<typeof dashboardActivityItemSchema>;

export const dashboardAttentionItemSchema = z.object({
  key: z.string(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  title: z.string(),
  description: z.string(),
  href: z.string().nullable(),
  count: z.number().int().nonnegative().optional(),
});
export type DashboardAttentionItem = z.infer<typeof dashboardAttentionItemSchema>;

export const dashboardQuickActionSchema = z.object({
  key: z.string(),
  label: z.string(),
  href: z.string(),
  description: z.string().nullable().optional(),
});
export type DashboardQuickAction = z.infer<typeof dashboardQuickActionSchema>;

export const dashboardRecentItemSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  href: z.string().nullable(),
  occurredAt: z.string().datetime().nullable().optional(),
});
export type DashboardRecentItem = z.infer<typeof dashboardRecentItemSchema>;

export const developerDashboardResponseSchema = z.object({
  role: z.literal('DEVELOPER'),
  organizationPublicId: z.string(),
  organizationName: z.string(),
  metrics: z.array(dashboardMetricSchema),
  pipeline: z.array(dashboardPipelineStageSchema),
  recentActivity: z.array(dashboardActivityItemSchema),
  attentionItems: z.array(dashboardAttentionItemSchema),
  recentProjects: z.array(dashboardRecentItemSchema),
  recentProperties: z.array(dashboardRecentItemSchema),
  quickActions: z.array(dashboardQuickActionSchema),
  generatedAt: z.string().datetime(),
});
export type DeveloperDashboardResponse = z.infer<typeof developerDashboardResponseSchema>;

export const agentDashboardResponseSchema = z.object({
  role: z.literal('AGENT'),
  organizationPublicId: z.string(),
  organizationName: z.string(),
  metrics: z.array(dashboardMetricSchema),
  pipeline: z.array(dashboardPipelineStageSchema),
  recentActivity: z.array(dashboardActivityItemSchema),
  attentionItems: z.array(dashboardAttentionItemSchema),
  recentLeads: z.array(dashboardRecentItemSchema),
  quickActions: z.array(dashboardQuickActionSchema),
  walletBalanceMinor: z.string().nullable(),
  walletCurrency: z.string().nullable(),
  generatedAt: z.string().datetime(),
});
export type AgentDashboardResponse = z.infer<typeof agentDashboardResponseSchema>;

export const seekerDashboardResponseSchema = z.object({
  role: z.literal('SEEKER'),
  metrics: z.array(dashboardMetricSchema),
  recentRequirements: z.array(dashboardRecentItemSchema),
  recentNotifications: z.array(dashboardRecentItemSchema),
  attentionItems: z.array(dashboardAttentionItemSchema),
  quickActions: z.array(dashboardQuickActionSchema),
  generatedAt: z.string().datetime(),
});
export type SeekerDashboardResponse = z.infer<typeof seekerDashboardResponseSchema>;

export const propertyAdminDashboardResponseSchema = z.object({
  role: z.literal('PROPERTY_ADMIN'),
  metrics: z.array(dashboardMetricSchema),
  assignedProperties: z.array(dashboardRecentItemSchema),
  assignedProjects: z.array(dashboardRecentItemSchema),
  attentionItems: z.array(dashboardAttentionItemSchema),
  quickActions: z.array(dashboardQuickActionSchema),
  generatedAt: z.string().datetime(),
});
export type PropertyAdminDashboardResponse = z.infer<typeof propertyAdminDashboardResponseSchema>;

export const adminDashboardResponseSchema = z.object({
  role: z.literal('ADMIN'),
  metrics: z.array(dashboardMetricSchema),
  attentionItems: z.array(dashboardAttentionItemSchema),
  recentActivity: z.array(dashboardActivityItemSchema),
  quickActions: z.array(dashboardQuickActionSchema),
  generatedAt: z.string().datetime(),
});
export type AdminDashboardResponse = z.infer<typeof adminDashboardResponseSchema>;

export const ensureCrmContactFromLeadRequestSchema = z.object({
  organizationPublicId: z.string().regex(/^PS-ORG-\d+$/),
  leadPublicId: z.string().regex(/^PS-LEAD-\d+$/),
  includeRevealedContact: z.boolean().optional().default(false),
});
export type EnsureCrmContactFromLeadRequest = z.infer<typeof ensureCrmContactFromLeadRequestSchema>;

export const ensureCrmContactFromLeadResponseSchema = z.object({
  created: z.boolean(),
  contactPublicId: z.string(),
  sourceLeadPublicId: z.string(),
  contactFieldsIncluded: z.boolean(),
});
export type EnsureCrmContactFromLeadResponse = z.infer<
  typeof ensureCrmContactFromLeadResponseSchema
>;

// ---------------------------------------------------------------------------
// Phase 14B — Advanced Discovery, Saved Searches & Smart Alerts
// ---------------------------------------------------------------------------

export const discoverySortSchema = z.enum(['newest', 'price_asc', 'price_desc', 'bedrooms_desc']);
export type DiscoverySort = z.infer<typeof discoverySortSchema>;

export const savedSearchAlertFrequencySchema = z.enum(['OFF', 'IMMEDIATE']);
export type SavedSearchAlertFrequency = z.infer<typeof savedSearchAlertFrequencySchema>;

/** Durable filter criteria stored on saved searches and used by advanced discovery. */
export const discoveryCriteriaSchema = z.object({
  city: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(120).optional(),
  state: z.string().trim().max(80).optional(),
  propertyType: propertyTypeSchema.optional(),
  listingType: listingTypeSchema.optional(),
  configuration: propertyConfigurationSchema.optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  minBedrooms: z.number().int().min(0).max(50).optional(),
  /** Stored as decimal string of minor units for JSON durability. */
  minPriceMinor: z.string().regex(/^\d+$/).optional(),
  maxPriceMinor: z.string().regex(/^\d+$/).optional(),
  availabilityStatus: propertyAvailabilityStatusSchema.optional(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional(),
  q: z.string().trim().max(120).optional(),
});
export type DiscoveryCriteria = z.infer<typeof discoveryCriteriaSchema>;

export const discoveryPropertyListQuerySchema = cursorPaginationQuerySchema.extend({
  city: z.string().trim().max(80).optional(),
  locality: z.string().trim().max(120).optional(),
  state: z.string().trim().max(80).optional(),
  propertyType: propertyTypeSchema.optional(),
  listingType: listingTypeSchema.optional(),
  configuration: propertyConfigurationSchema.optional(),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  minBedrooms: z.coerce.number().int().min(0).max(50).optional(),
  minPriceMinor: z.coerce.bigint().optional(),
  maxPriceMinor: z.coerce.bigint().optional(),
  availabilityStatus: propertyAvailabilityStatusSchema.optional(),
  projectPublicId: z
    .string()
    .regex(/^PS-PROJ-\d+$/)
    .optional(),
  q: z.string().trim().max(120).optional(),
  sort: discoverySortSchema.default('newest'),
  includeFacets: z.coerce.boolean().optional().default(false),
});
export type DiscoveryPropertyListQuery = z.infer<typeof discoveryPropertyListQuerySchema>;

export const discoveryFacetBucketSchema = z.object({
  value: z.string(),
  count: z.number().int().nonnegative(),
});
export type DiscoveryFacetBucket = z.infer<typeof discoveryFacetBucketSchema>;

export const discoveryFacetsSchema = z.object({
  propertyTypes: z.array(discoveryFacetBucketSchema),
  cities: z.array(discoveryFacetBucketSchema),
  configurations: z.array(discoveryFacetBucketSchema),
  listingTypes: z.array(discoveryFacetBucketSchema),
});
export type DiscoveryFacets = z.infer<typeof discoveryFacetsSchema>;

export const discoveryPropertyListResponseSchema = z.object({
  properties: z.array(publicPropertySummarySchema),
  nextCursor: z.string().nullable(),
  totalEstimate: z.number().int().nonnegative().nullable(),
  facets: discoveryFacetsSchema.nullable(),
  sort: discoverySortSchema,
});
export type DiscoveryPropertyListResponse = z.infer<typeof discoveryPropertyListResponseSchema>;

export const createSavedSearchRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  criteria: discoveryCriteriaSchema,
  alertFrequency: savedSearchAlertFrequencySchema.optional().default('OFF'),
});
export type CreateSavedSearchRequest = z.infer<typeof createSavedSearchRequestSchema>;

export const updateSavedSearchRequestSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  criteria: discoveryCriteriaSchema.optional(),
  alertFrequency: savedSearchAlertFrequencySchema.optional(),
});
export type UpdateSavedSearchRequest = z.infer<typeof updateSavedSearchRequestSchema>;

export const savedSearchSummarySchema = z.object({
  publicId: z.string(),
  name: z.string(),
  criteria: discoveryCriteriaSchema,
  alertFrequency: savedSearchAlertFrequencySchema,
  lastAlertedAt: z.string().datetime().nullable(),
  lastRunAt: z.string().datetime().nullable(),
  matchCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SavedSearchSummary = z.infer<typeof savedSearchSummarySchema>;

export const savedSearchListResponseSchema = z.object({
  savedSearches: z.array(savedSearchSummarySchema),
  nextCursor: z.string().nullable(),
});
export type SavedSearchListResponse = z.infer<typeof savedSearchListResponseSchema>;

export const savedSearchListQuerySchema = cursorPaginationQuerySchema;
export type SavedSearchListQuery = z.infer<typeof savedSearchListQuerySchema>;

export const runSavedSearchResponseSchema = z.object({
  savedSearchPublicId: z.string(),
  result: discoveryPropertyListResponseSchema,
});
export type RunSavedSearchResponse = z.infer<typeof runSavedSearchResponseSchema>;

export const createSavedPropertyRequestSchema = z.object({
  propertyPublicId: z.string().regex(/^PS-PROP-\d+$/),
  note: z.string().trim().max(500).optional().nullable(),
});
export type CreateSavedPropertyRequest = z.infer<typeof createSavedPropertyRequestSchema>;

export const savedPropertySummarySchema = z.object({
  publicId: z.string(),
  propertyPublicId: z.string(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  property: publicPropertySummarySchema.nullable(),
});
export type SavedPropertySummary = z.infer<typeof savedPropertySummarySchema>;

export const savedPropertyListResponseSchema = z.object({
  savedProperties: z.array(savedPropertySummarySchema),
  nextCursor: z.string().nullable(),
});
export type SavedPropertyListResponse = z.infer<typeof savedPropertyListResponseSchema>;

export const savedPropertyListQuerySchema = cursorPaginationQuerySchema;
export type SavedPropertyListQuery = z.infer<typeof savedPropertyListQuerySchema>;

export const savedSearchMatchSummarySchema = z.object({
  publicId: z.string(),
  savedSearchPublicId: z.string(),
  savedSearchName: z.string(),
  propertyPublicId: z.string(),
  propertyTitle: z.string().nullable(),
  matchedAt: z.string().datetime(),
  notifiedAt: z.string().datetime().nullable(),
});
export type SavedSearchMatchSummary = z.infer<typeof savedSearchMatchSummarySchema>;

export const savedSearchMatchListResponseSchema = z.object({
  matches: z.array(savedSearchMatchSummarySchema),
  nextCursor: z.string().nullable(),
});
export type SavedSearchMatchListResponse = z.infer<typeof savedSearchMatchListResponseSchema>;

export const savedSearchMatchListQuerySchema = cursorPaginationQuerySchema.extend({
  savedSearchPublicId: z
    .string()
    .regex(/^PS-SSEARCH-\d+$/)
    .optional(),
});
export type SavedSearchMatchListQuery = z.infer<typeof savedSearchMatchListQuerySchema>;

// ─── Phase 14C: AI Contextual Intelligence ──────────────────────────────────

export const aiNextBestActionSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  category: z.enum([
    'FOLLOW_UP',
    'SITE_VISIT',
    'LEAD',
    'DEAL',
    'SAVED_SEARCH',
    'SAVED_PROPERTY',
    'REQUIREMENT',
    'GENERAL',
  ]),
  href: z.string().nullable(),
  entityType: z.string().nullable(),
  entityPublicId: z.string().nullable(),
  evidence: z.array(z.string()).default([]),
});
export type AiNextBestAction = z.infer<typeof aiNextBestActionSchema>;

export const aiAssembledContextQuerySchema = aiConversationContextHintsSchema;
export type AiAssembledContextQuery = z.infer<typeof aiAssembledContextQuerySchema>;

export const aiAssembledContextResponseSchema = z.object({
  roleLabel: z.string(),
  userPublicId: z.string(),
  activeOrganizationPublicId: z.string().nullable(),
  labels: z.array(z.string()),
  hints: aiConversationContextHintsSchema,
  summary: z.object({
    savedPropertyCount: z.number().int().nonnegative().nullable(),
    savedSearchCount: z.number().int().nonnegative().nullable(),
    activeRequirementCount: z.number().int().nonnegative().nullable(),
    openLeadCount: z.number().int().nonnegative().nullable(),
    overdueFollowUpCount: z.number().int().nonnegative().nullable(),
    upcomingSiteVisitCount: z.number().int().nonnegative().nullable(),
    openDealCount: z.number().int().nonnegative().nullable(),
  }),
  focusedProperty: z
    .object({
      publicId: z.string(),
      title: z.string(),
      coverageState: intelligenceDataStateSchema,
    })
    .nullable(),
  focusedProject: z
    .object({
      publicId: z.string(),
      name: z.string(),
      coverageState: intelligenceDataStateSchema,
    })
    .nullable(),
  focusedRequirement: z
    .object({
      publicId: z.string(),
      title: z.string().nullable(),
      coverageState: intelligenceDataStateSchema,
    })
    .nullable(),
  nextBestActions: z.array(aiNextBestActionSchema),
  coverageState: intelligenceDataStateSchema,
  disclaimer: z.string(),
});
export type AiAssembledContextResponse = z.infer<typeof aiAssembledContextResponseSchema>;

// ---------------------------------------------------------------------------
// Phase 14D — Admin Control Center & Platform Analytics
// ---------------------------------------------------------------------------

export const adminAnalyticsPeriodSchema = z.enum([
  'TODAY',
  'DAYS_7',
  'DAYS_30',
  'DAYS_90',
  'CUSTOM',
]);
export type AdminAnalyticsPeriod = z.infer<typeof adminAnalyticsPeriodSchema>;

export const adminAnalyticsQuerySchema = z.object({
  period: adminAnalyticsPeriodSchema.default('DAYS_30'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AdminAnalyticsQuery = z.infer<typeof adminAnalyticsQuerySchema>;

export const adminMetricCoverageSchema = z.enum(['READY', 'ZERO', 'UNAVAILABLE']);
export type AdminMetricCoverage = z.infer<typeof adminMetricCoverageSchema>;

export const adminControlMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.union([z.number(), z.string()]).nullable(),
  coverageState: adminMetricCoverageSchema,
  unit: z.enum(['count', 'money_minor', 'ratio', 'text']).default('count'),
  currency: z.string().nullable().optional(),
  href: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type AdminControlMetric = z.infer<typeof adminControlMetricSchema>;

export const adminNamedCountSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
});
export type AdminNamedCount = z.infer<typeof adminNamedCountSchema>;

export const adminFunnelStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative().nullable(),
  coverageState: adminMetricCoverageSchema,
  note: z.string().nullable().optional(),
});
export type AdminFunnelStep = z.infer<typeof adminFunnelStepSchema>;

export const adminControlCenterResponseSchema = z.object({
  period: adminAnalyticsPeriodSchema,
  timezone: z.literal('Asia/Kolkata'),
  rangeStart: z.string().datetime(),
  rangeEnd: z.string().datetime(),
  users: z.object({
    total: adminControlMetricSchema,
    newInPeriod: adminControlMetricSchema,
    byPersona: z.array(adminNamedCountSchema),
    byPlatformRole: z.array(adminNamedCountSchema),
    activeUsers: adminControlMetricSchema,
  }),
  organizations: z.object({
    total: adminControlMetricSchema,
    developers: adminControlMetricSchema,
    agencies: adminControlMetricSchema,
    pendingVerification: adminControlMetricSchema,
  }),
  catalog: z.object({
    projects: adminControlMetricSchema,
    properties: adminControlMetricSchema,
    publishedProperties: adminControlMetricSchema,
    draftProperties: adminControlMetricSchema,
    communities: adminControlMetricSchema,
    mediaAssets: adminControlMetricSchema,
    projectsByStatus: z.array(adminNamedCountSchema),
    propertiesByStatus: z.array(adminNamedCountSchema),
    propertiesByCity: z.array(adminNamedCountSchema),
  }),
  demand: z.object({
    requirements: adminControlMetricSchema,
    activeRequirements: adminControlMetricSchema,
    marketplaceRequirements: adminControlMetricSchema,
    leads: adminControlMetricSchema,
    leadsCreatedInPeriod: adminControlMetricSchema,
    leadLifecycle: z.array(adminNamedCountSchema),
    requirementsByPropertyType: z.array(adminNamedCountSchema),
    requirementsByCity: z.array(adminNamedCountSchema),
  }),
  crm: z.object({
    contacts: adminControlMetricSchema,
    openFollowUps: adminControlMetricSchema,
    scheduledSiteVisits: adminControlMetricSchema,
    openDeals: adminControlMetricSchema,
    closedDeals: adminControlMetricSchema,
  }),
  trust: z.object({
    pendingVerificationCases: adminControlMetricSchema,
    verifiedDevelopers: adminControlMetricSchema,
    verifiedAgents: adminControlMetricSchema,
    publishedReviews: adminControlMetricSchema,
    openReviewReports: adminControlMetricSchema,
    openContentReports: adminControlMetricSchema,
  }),
  money: z.object({
    activeSubscriptions: adminControlMetricSchema,
    subscriptionsByStatus: z.array(adminNamedCountSchema),
    paymentVolumeCapturedMinor: adminControlMetricSchema,
    walletBalancesMinor: adminControlMetricSchema,
    leadPurchasesInPeriod: adminControlMetricSchema,
    refundsInPeriod: adminControlMetricSchema,
    failedPaymentsInPeriod: adminControlMetricSchema,
  }),
  media: z.object({
    publishedMedia: adminControlMetricSchema,
    pendingModeration: adminControlMetricSchema,
    analyticsEventsInPeriod: adminControlMetricSchema,
  }),
  integrations: z.object({
    activeApiClients: adminControlMetricSchema,
    activeWebhookEndpoints: adminControlMetricSchema,
    failedWebhookDeliveries: adminControlMetricSchema,
    openDeadLetters: adminControlMetricSchema,
    failedBackgroundJobs: adminControlMetricSchema,
  }),
  ai: z.object({
    conversations: adminControlMetricSchema,
    messagesInPeriod: adminControlMetricSchema,
    toolInvocationsInPeriod: adminControlMetricSchema,
    unavailableResponsesInPeriod: adminControlMetricSchema,
    providerName: z.string(),
    providerStatus: z.enum(['CONFIGURED', 'UNAVAILABLE']),
  }),
  funnel: z.array(adminFunnelStepSchema),
  attentionItems: z.array(dashboardAttentionItemSchema),
  recentAudit: z.array(dashboardActivityItemSchema),
  quickActions: z.array(dashboardQuickActionSchema),
  generatedAt: z.string().datetime(),
});
export type AdminControlCenterResponse = z.infer<typeof adminControlCenterResponseSchema>;

export const adminSystemComponentStatusSchema = z.enum(['HEALTHY', 'DEGRADED', 'UNAVAILABLE']);
export type AdminSystemComponentStatus = z.infer<typeof adminSystemComponentStatusSchema>;

export const adminSystemComponentSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: adminSystemComponentStatusSchema,
  latencyMs: z.number().nullable().optional(),
  detail: z.string().nullable().optional(),
});
export type AdminSystemComponent = z.infer<typeof adminSystemComponentSchema>;

export const adminSystemHealthResponseSchema = z.object({
  overall: adminSystemComponentStatusSchema,
  components: z.array(adminSystemComponentSchema),
  providers: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      configured: z.boolean(),
      mode: z.string().nullable(),
    }),
  ),
  checkedAt: z.string().datetime(),
});
export type AdminSystemHealthResponse = z.infer<typeof adminSystemHealthResponseSchema>;

export const adminAuditListQuerySchema = cursorPaginationQuerySchema.extend({
  action: z.string().trim().max(120).optional(),
  resourceType: z.string().trim().max(80).optional(),
  actorUserPublicId: z
    .string()
    .regex(/^PS-USER-\d+$/)
    .optional(),
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  securityOnly: z.coerce.boolean().optional().default(false),
});
export type AdminAuditListQuery = z.infer<typeof adminAuditListQuerySchema>;

export const adminAuditEventSchema = z.object({
  id: z.string(),
  action: z.string(),
  resourceType: z.string().nullable(),
  resourceId: z.string().nullable(),
  actorUserPublicId: z.string().nullable(),
  organizationPublicId: z.string().nullable(),
  requestId: z.string().nullable(),
  createdAt: z.string().datetime(),
  metadataKeys: z.array(z.string()).default([]),
});
export type AdminAuditEvent = z.infer<typeof adminAuditEventSchema>;

export const adminAuditListResponseSchema = z.object({
  items: z.array(adminAuditEventSchema),
  nextCursor: z.string().nullable(),
});
export type AdminAuditListResponse = z.infer<typeof adminAuditListResponseSchema>;

export const adminAiGovernanceResponseSchema = z.object({
  providerName: z.string(),
  providerStatus: z.enum(['CONFIGURED', 'UNAVAILABLE']),
  conversations: adminControlMetricSchema,
  activeConversations: adminControlMetricSchema,
  messages: adminControlMetricSchema,
  toolInvocations: adminControlMetricSchema,
  unavailableAssistantReplies: adminControlMetricSchema,
  analyticsByType: z.array(adminNamedCountSchema),
  note: z.string(),
  generatedAt: z.string().datetime(),
});
export type AdminAiGovernanceResponse = z.infer<typeof adminAiGovernanceResponseSchema>;
