import {
  addOrganizationMemberRequestSchema,
  agencyProfileSchema,
  apiErrorBodySchema,
  authSuccessResponseSchema,
  changePasswordRequestSchema,
  communityListQuerySchema,
  communityListResponseSchema,
  communitySummarySchema,
  createCommunityRequestSchema,
  createOrganizationRequestSchema,
  createProjectRequestSchema,
  createPropertyRequestSchema,
  developerProfileSchema,
  healthResponseSchema,
  loginRequestSchema,
  okResponseSchema,
  onboardOrganizationRequestSchema,
  onboardOrganizationResponseSchema,
  organizationDetailSchema,
  organizationListResponseSchema,
  organizationMembersResponseSchema,
  organizationSummarySchema,
  projectDetailSchema,
  projectListQuerySchema,
  projectListResponseSchema,
  propertyDetailSchema,
  propertyListQuerySchema,
  propertyListResponseSchema,
  publicAgencyProfileSchema,
  publicDeveloperProfileSchema,
  publicProjectDetailSchema,
  publicProjectListQuerySchema,
  publicProjectListResponseSchema,
  publicPropertyDetailSchema,
  publicPropertyListQuerySchema,
  publicPropertyListResponseSchema,
  readyResponseSchema,
  registerRequestSchema,
  switchOrganizationResponseSchema,
  updateAgencyProfileRequestSchema,
  updateDeveloperProfileRequestSchema,
  updateOrganizationMemberRequestSchema,
  updateOrganizationRequestSchema,
  updateProjectRequestSchema,
  updatePropertyRequestSchema,
  adminLeadListQuerySchema,
  adminLeadListResponseSchema,
  adminRequirementListQuerySchema,
  adminRequirementListResponseSchema,
  createMarketplaceLeadRequestSchema,
  createRequirementRequestSchema,
  leadListQuerySchema,
  leadListResponseSchema,
  leadSummarySchema,
  publicRequirementDetailSchema,
  publicRequirementListQuerySchema,
  publicRequirementListResponseSchema,
  requirementDetailSchema,
  requirementListQuerySchema,
  requirementListResponseSchema,
  updateLeadStatusRequestSchema,
  updateRequirementRequestSchema,
  assignCrmLeadRequestSchema,
  createCrmActivityRequestSchema,
  createCrmContactRequestSchema,
  createCrmDealRequestSchema,
  createCrmFollowUpRequestSchema,
  createCrmSiteVisitRequestSchema,
  crmActivityListQuerySchema,
  crmActivityListResponseSchema,
  crmActivitySummarySchema,
  crmContactListQuerySchema,
  crmContactListResponseSchema,
  crmContactSummarySchema,
  crmDealListQuerySchema,
  crmDealListResponseSchema,
  crmDealSummarySchema,
  crmFollowUpListQuerySchema,
  crmFollowUpListResponseSchema,
  crmFollowUpSummarySchema,
  crmLeadDetailSchema,
  crmLeadListQuerySchema,
  crmLeadListResponseSchema,
  crmLeadSummarySchema,
  crmOverviewQuerySchema,
  crmOverviewSchema,
  crmSiteVisitListQuerySchema,
  crmSiteVisitListResponseSchema,
  crmSiteVisitSummarySchema,
  updateCrmDealRequestSchema,
  updateCrmFollowUpRequestSchema,
  updateCrmLeadStatusRequestSchema,
  updateCrmSiteVisitRequestSchema,
  adminSubscriptionListQuerySchema,
  adminSubscriptionListResponseSchema,
  adminWalletListQuerySchema,
  adminWalletListResponseSchema,
  billingOverviewQuerySchema,
  billingOverviewSchema,
  cancelOrganizationSubscriptionRequestSchema,
  createLeadPurchaseRequestSchema,
  createOrganizationSubscriptionRequestSchema,
  createRefundRequestSchema,
  createSubscriptionPlanRequestSchema,
  financialTransactionListQuerySchema,
  financialTransactionListResponseSchema,
  financialTransactionSummarySchema,
  invoiceListQuerySchema,
  invoiceListResponseSchema,
  invoiceSummarySchema,
  leadPurchaseSummarySchema,
  organizationSubscriptionSummarySchema,
  refundSummarySchema,
  subscriptionPlanListQuerySchema,
  subscriptionPlanListResponseSchema,
  subscriptionPlanSummarySchema,
  updateSubscriptionPlanRequestSchema,
  walletLedgerListQuerySchema,
  walletLedgerListResponseSchema,
  walletSummarySchema,
  walletTopUpRequestSchema,
  walletTopUpResponseSchema,
  adminVerificationCaseListQuerySchema,
  adminReportListQuerySchema,
  adminReportListResponseSchema,
  attachVerificationDocumentRequestSchema,
  conversationDetailSchema,
  conversationListQuerySchema,
  conversationListResponseSchema,
  conversationSummarySchema,
  createConversationRequestSchema,
  createReviewRequestSchema,
  createVerificationCaseRequestSchema,
  leadAccessQuerySchema,
  leadAccessStatusSchema,
  leadContactRevealResponseSchema,
  messageSummarySchema,
  moderateReviewRequestSchema,
  notificationListQuerySchema,
  notificationListResponseSchema,
  notificationPreferencesResponseSchema,
  notificationSummarySchema,
  reportReviewRequestSchema,
  reviewListQuerySchema,
  reviewListResponseSchema,
  reviewReportSummarySchema,
  reviewSummarySchema,
  reviewVerificationCaseRequestSchema,
  sendMessageRequestSchema,
  submitVerificationCaseRequestSchema,
  trustScoreResponseSchema,
  updateNotificationPreferencesRequestSchema,
  updateOwnReviewRequestSchema,
  updateVerificationCaseRequestSchema,
  updateVerificationDocumentRequestSchema,
  verificationCaseDetailSchema,
  verificationCaseListQuerySchema,
  verificationCaseListResponseSchema,
  verificationDocumentAccessSchema,
  verificationDocumentSummarySchema,
  aiAssistantRequestSchema,
  aiAssistantResponseSchema,
  aiDocumentAnalysisRequestSchema,
  aiDocumentAnalysisResponseSchema,
  aiFloorPlanAnalysisRequestSchema,
  aiFloorPlanAnalysisResponseSchema,
  aiJobSummarySchema,
  aiPropertyMatchRequestSchema,
  aiPropertyMatchResponseSchema,
  aiPropertySearchRequestSchema,
  aiPropertySearchResponseSchema,
  aiValuationRequestSchema,
  aiValuationResponseSchema,
  infrastructureListResponseSchema,
  infrastructureQuerySchema,
  intelligenceCompareRequestSchema,
  intelligenceCompareResponseSchema,
  intelligenceMatchRequestSchema,
  intelligenceMatchResponseSchema,
  intelligenceObservationListQuerySchema,
  intelligenceObservationListResponseSchema,
  marketQuerySchema,
  marketSnapshotListResponseSchema,
  marketTrendResponseSchema,
  projectIntelligenceDetailSchema,
  propertyIntelligenceDetailSchema,
  type AddOrganizationMemberRequest,
  type AgencyProfile,
  type AuthSuccessResponse,
  type ChangePasswordRequest,
  type CommunityListQuery,
  type CommunityListResponse,
  type CommunitySummary,
  type CreateCommunityRequest,
  type CreateOrganizationRequest,
  type CreateProjectRequest,
  type CreatePropertyRequest,
  type DeveloperProfile,
  type HealthResponse,
  type LoginRequest,
  type OkResponse,
  type OnboardOrganizationRequest,
  type OnboardOrganizationResponse,
  type OrganizationDetail,
  type OrganizationListResponse,
  type OrganizationMembersResponse,
  type OrganizationSummary,
  type ProjectDetail,
  type ProjectListQuery,
  type ProjectListResponse,
  type PropertyDetail,
  type PropertyListQuery,
  type PropertyListResponse,
  type PublicAgencyProfile,
  type PublicDeveloperProfile,
  type PublicProjectDetail,
  type PublicProjectListQuery,
  type PublicProjectListResponse,
  type PublicPropertyDetail,
  type PublicPropertyListQuery,
  type PublicPropertyListResponse,
  type ReadyResponse,
  type RegisterRequest,
  type SwitchOrganizationResponse,
  type UpdateAgencyProfileRequest,
  type UpdateDeveloperProfileRequest,
  type UpdateOrganizationMemberRequest,
  type UpdateOrganizationRequest,
  type UpdateProjectRequest,
  type UpdatePropertyRequest,
  type AdminLeadListQuery,
  type AdminLeadListResponse,
  type AdminRequirementListQuery,
  type AdminRequirementListResponse,
  type CreateMarketplaceLeadRequest,
  type CreateRequirementRequest,
  type LeadListQuery,
  type LeadListResponse,
  type LeadSummary,
  type PublicRequirementDetail,
  type PublicRequirementListQuery,
  type PublicRequirementListResponse,
  type RequirementDetail,
  type RequirementListQuery,
  type RequirementListResponse,
  type UpdateLeadStatusRequest,
  type UpdateRequirementRequest,
  type AssignCrmLeadRequest,
  type CreateCrmActivityRequest,
  type CreateCrmContactRequest,
  type CreateCrmDealRequest,
  type CreateCrmFollowUpRequest,
  type CreateCrmSiteVisitRequest,
  type CrmActivityListQuery,
  type CrmActivityListResponse,
  type CrmActivitySummary,
  type CrmContactListQuery,
  type CrmContactListResponse,
  type CrmContactSummary,
  type CrmDealListQuery,
  type CrmDealListResponse,
  type CrmDealSummary,
  type CrmFollowUpListQuery,
  type CrmFollowUpListResponse,
  type CrmFollowUpSummary,
  type CrmLeadDetail,
  type CrmLeadListQuery,
  type CrmLeadListResponse,
  type CrmLeadSummary,
  type CrmOverview,
  type CrmOverviewQuery,
  type CrmSiteVisitListQuery,
  type CrmSiteVisitListResponse,
  type CrmSiteVisitSummary,
  type UpdateCrmDealRequest,
  type UpdateCrmFollowUpRequest,
  type UpdateCrmLeadStatusRequest,
  type UpdateCrmSiteVisitRequest,
  type AdminSubscriptionListQuery,
  type AdminSubscriptionListResponse,
  type AdminWalletListQuery,
  type AdminWalletListResponse,
  type BillingOverview,
  type BillingOverviewQuery,
  type CancelOrganizationSubscriptionRequest,
  type CreateLeadPurchaseRequest,
  type CreateOrganizationSubscriptionRequest,
  type CreateRefundRequest,
  type CreateSubscriptionPlanRequest,
  type FinancialTransactionListQuery,
  type FinancialTransactionListResponse,
  type FinancialTransactionSummary,
  type InvoiceListQuery,
  type InvoiceListResponse,
  type InvoiceSummary,
  type LeadPurchaseSummary,
  type OrganizationSubscriptionSummary,
  type RefundSummary,
  type SubscriptionPlanListQuery,
  type SubscriptionPlanListResponse,
  type SubscriptionPlanSummary,
  type UpdateSubscriptionPlanRequest,
  type WalletLedgerListQuery,
  type WalletLedgerListResponse,
  type WalletSummary,
  type WalletTopUpRequest,
  type WalletTopUpResponse,
  type AdminVerificationCaseListQuery,
  type AdminReportListQuery,
  type AdminReportListResponse,
  type AttachVerificationDocumentRequest,
  type ConversationDetail,
  type ConversationListQuery,
  type ConversationListResponse,
  type ConversationSummary,
  type CreateConversationRequest,
  type CreateReviewRequest,
  type CreateVerificationCaseRequest,
  type LeadAccessQuery,
  type LeadAccessStatus,
  type LeadContactRevealResponse,
  type MessageSummary,
  type ModerateReviewRequest,
  type NotificationListQuery,
  type NotificationListResponse,
  type NotificationPreferencesResponse,
  type NotificationSummary,
  type ReportReviewRequest,
  type ReviewListQuery,
  type ReviewListResponse,
  type ReviewReportSummary,
  type ReviewSummary,
  type ReviewVerificationCaseRequest,
  type SendMessageRequest,
  type SubmitVerificationCaseRequest,
  type TrustScoreResponse,
  type UpdateNotificationPreferencesRequest,
  type UpdateOwnReviewRequest,
  type UpdateVerificationCaseRequest,
  type UpdateVerificationDocumentRequest,
  type VerificationCaseDetail,
  type VerificationCaseListQuery,
  type VerificationCaseListResponse,
  type VerificationDocumentAccess,
  type VerificationDocumentSummary,
  type ReviewSubjectType,
  type AiAssistantRequest,
  type AiAssistantResponse,
  type AiDocumentAnalysisRequest,
  type AiDocumentAnalysisResponse,
  type AiFloorPlanAnalysisRequest,
  type AiFloorPlanAnalysisResponse,
  type AiJobSummary,
  type AiPropertyMatchRequest,
  type AiPropertyMatchResponse,
  type AiPropertySearchRequest,
  type AiPropertySearchResponse,
  type AiValuationRequest,
  type AiValuationResponse,
  type InfrastructureListResponse,
  type InfrastructureQuery,
  type IntelligenceCompareRequest,
  type IntelligenceCompareResponse,
  type IntelligenceMatchRequest,
  type IntelligenceMatchResponse,
  type IntelligenceObservationListQuery,
  type IntelligenceObservationListResponse,
  type MarketQuery,
  type MarketSnapshotListResponse,
  type MarketTrendResponse,
  type ProjectIntelligenceDetail,
  type PropertyIntelligenceDetail,
} from '@property-studio/contracts';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export type ApiClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
};

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly credentials: RequestCredentials | undefined;
  private readonly defaultHeaders: HeadersInit | undefined;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetch ?? fetch;
    this.credentials = options.credentials;
    this.defaultHeaders = options.headers;
  }

  async getHealth(): Promise<HealthResponse> {
    return this.request('/health', healthResponseSchema);
  }

  async getReady(): Promise<ReadyResponse> {
    return this.request('/ready', readyResponseSchema);
  }

  async register(input: RegisterRequest): Promise<AuthSuccessResponse> {
    const body = registerRequestSchema.parse(input);
    return this.request('/api/v1/auth/register', authSuccessResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async login(input: LoginRequest): Promise<AuthSuccessResponse> {
    const body = loginRequestSchema.parse(input);
    return this.request('/api/v1/auth/login', authSuccessResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async logout(): Promise<OkResponse> {
    return this.request('/api/v1/auth/logout', okResponseSchema, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async me(): Promise<AuthSuccessResponse> {
    return this.request('/api/v1/auth/me', authSuccessResponseSchema);
  }

  async changePassword(input: ChangePasswordRequest): Promise<OkResponse> {
    const body = changePasswordRequestSchema.parse(input);
    return this.request('/api/v1/auth/password/change', okResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listOrganizations(): Promise<OrganizationListResponse> {
    return this.request('/api/v1/organizations', organizationListResponseSchema);
  }

  async getOrganization(publicId: string): Promise<OrganizationDetail> {
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(publicId)}`,
      organizationDetailSchema,
    );
  }

  async createOrganization(input: CreateOrganizationRequest): Promise<OrganizationSummary> {
    const body = createOrganizationRequestSchema.parse(input);
    return this.request('/api/v1/organizations', organizationSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async onboardOrganization(
    input: OnboardOrganizationRequest,
  ): Promise<OnboardOrganizationResponse> {
    const body = onboardOrganizationRequestSchema.parse(input);
    return this.request('/api/v1/organizations/onboard', onboardOrganizationResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateOrganization(
    publicId: string,
    input: UpdateOrganizationRequest,
  ): Promise<OrganizationDetail> {
    const body = updateOrganizationRequestSchema.parse(input);
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(publicId)}`,
      organizationDetailSchema,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    );
  }

  async switchOrganization(publicId: string): Promise<SwitchOrganizationResponse> {
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(publicId)}/switch`,
      switchOrganizationResponseSchema,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
  }

  async getDeveloperProfile(organizationPublicId: string): Promise<DeveloperProfile> {
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(organizationPublicId)}/developer-profile`,
      developerProfileSchema,
    );
  }

  async updateDeveloperProfile(
    organizationPublicId: string,
    input: UpdateDeveloperProfileRequest,
  ): Promise<DeveloperProfile> {
    const body = updateDeveloperProfileRequestSchema.parse(input);
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(organizationPublicId)}/developer-profile`,
      developerProfileSchema,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  async getAgencyProfile(organizationPublicId: string): Promise<AgencyProfile> {
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(organizationPublicId)}/agency-profile`,
      agencyProfileSchema,
    );
  }

  async updateAgencyProfile(
    organizationPublicId: string,
    input: UpdateAgencyProfileRequest,
  ): Promise<AgencyProfile> {
    const body = updateAgencyProfileRequestSchema.parse(input);
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(organizationPublicId)}/agency-profile`,
      agencyProfileSchema,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  async listOrganizationMembers(publicId: string): Promise<OrganizationMembersResponse> {
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(publicId)}/members`,
      organizationMembersResponseSchema,
    );
  }

  async inviteOrganizationMember(
    publicId: string,
    input: AddOrganizationMemberRequest,
  ): Promise<OkResponse> {
    const body = addOrganizationMemberRequestSchema.parse(input);
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(publicId)}/members`,
      okResponseSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async updateOrganizationMember(
    publicId: string,
    userPublicId: string,
    input: UpdateOrganizationMemberRequest,
  ): Promise<OkResponse> {
    const body = updateOrganizationMemberRequestSchema.parse(input);
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(publicId)}/members/${encodeURIComponent(userPublicId)}`,
      okResponseSchema,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }

  async deactivateOrganizationMember(publicId: string, userPublicId: string): Promise<OkResponse> {
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(publicId)}/members/${encodeURIComponent(userPublicId)}`,
      okResponseSchema,
      { method: 'DELETE' },
    );
  }

  async getPublicDeveloper(publicId: string): Promise<PublicDeveloperProfile> {
    return this.request(
      `/api/v1/developers/${encodeURIComponent(publicId)}`,
      publicDeveloperProfileSchema,
    );
  }

  async getPublicAgent(publicId: string): Promise<PublicAgencyProfile> {
    return this.request(
      `/api/v1/agents/${encodeURIComponent(publicId)}`,
      publicAgencyProfileSchema,
    );
  }

  async createProject(input: CreateProjectRequest): Promise<ProjectDetail> {
    const body = createProjectRequestSchema.parse(input);
    return this.request('/api/v1/projects', projectDetailSchema, {
      method: 'POST',
      body: JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    });
  }

  async listProjects(query: ProjectListQuery): Promise<ProjectListResponse> {
    const parsed = projectListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(`/api/v1/projects?${params.toString()}`, projectListResponseSchema);
  }

  async getProject(publicId: string): Promise<ProjectDetail> {
    return this.request(`/api/v1/projects/${encodeURIComponent(publicId)}`, projectDetailSchema);
  }

  async updateProject(publicId: string, input: UpdateProjectRequest): Promise<ProjectDetail> {
    const body = updateProjectRequestSchema.parse(input);
    return this.request(`/api/v1/projects/${encodeURIComponent(publicId)}`, projectDetailSchema, {
      method: 'PATCH',
      body: JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    });
  }

  async deleteProject(publicId: string): Promise<OkResponse> {
    return this.request(`/api/v1/projects/${encodeURIComponent(publicId)}`, okResponseSchema, {
      method: 'DELETE',
    });
  }

  async createProperty(input: CreatePropertyRequest): Promise<PropertyDetail> {
    const body = createPropertyRequestSchema.parse(input);
    return this.request('/api/v1/properties', propertyDetailSchema, {
      method: 'POST',
      body: JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    });
  }

  async listProperties(query: PropertyListQuery): Promise<PropertyListResponse> {
    const parsed = propertyListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(`/api/v1/properties?${params.toString()}`, propertyListResponseSchema);
  }

  async getProperty(publicId: string): Promise<PropertyDetail> {
    return this.request(`/api/v1/properties/${encodeURIComponent(publicId)}`, propertyDetailSchema);
  }

  async updateProperty(publicId: string, input: UpdatePropertyRequest): Promise<PropertyDetail> {
    const body = updatePropertyRequestSchema.parse(input);
    return this.request(
      `/api/v1/properties/${encodeURIComponent(publicId)}`,
      propertyDetailSchema,
      {
        method: 'PATCH',
        body: JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
      },
    );
  }

  async deleteProperty(publicId: string): Promise<OkResponse> {
    return this.request(`/api/v1/properties/${encodeURIComponent(publicId)}`, okResponseSchema, {
      method: 'DELETE',
    });
  }

  async listPublicProjects(
    query: Partial<PublicProjectListQuery> = {},
  ): Promise<PublicProjectListResponse> {
    const parsed = publicProjectListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    const qs = params.toString();
    return this.request(
      `/api/v1/public/projects${qs ? `?${qs}` : ''}`,
      publicProjectListResponseSchema,
    );
  }

  async getPublicProject(publicId: string): Promise<PublicProjectDetail> {
    return this.request(
      `/api/v1/public/projects/${encodeURIComponent(publicId)}`,
      publicProjectDetailSchema,
    );
  }

  async listPublicProperties(
    query: Partial<PublicPropertyListQuery> = {},
  ): Promise<PublicPropertyListResponse> {
    const parsed = publicPropertyListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    const qs = params.toString();
    return this.request(
      `/api/v1/public/properties${qs ? `?${qs}` : ''}`,
      publicPropertyListResponseSchema,
    );
  }

  async getPublicProperty(publicId: string): Promise<PublicPropertyDetail> {
    return this.request(
      `/api/v1/public/properties/${encodeURIComponent(publicId)}`,
      publicPropertyDetailSchema,
    );
  }

  async listCommunities(query: CommunityListQuery): Promise<CommunityListResponse> {
    const parsed = communityListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(`/api/v1/communities?${params.toString()}`, communityListResponseSchema);
  }

  async createCommunity(input: CreateCommunityRequest): Promise<CommunitySummary> {
    const body = createCommunityRequestSchema.parse(input);
    return this.request('/api/v1/communities', communitySummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async createRequirement(input: CreateRequirementRequest): Promise<RequirementDetail> {
    const body = createRequirementRequestSchema.parse(input);
    return this.request('/api/v1/requirements', requirementDetailSchema, {
      method: 'POST',
      body: JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    });
  }

  async listRequirements(
    query: Partial<RequirementListQuery> = {},
  ): Promise<RequirementListResponse> {
    const parsed = requirementListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(`/api/v1/requirements?${params.toString()}`, requirementListResponseSchema);
  }

  async getRequirement(publicId: string): Promise<RequirementDetail> {
    return this.request(
      `/api/v1/requirements/${encodeURIComponent(publicId)}`,
      requirementDetailSchema,
    );
  }

  async updateRequirement(
    publicId: string,
    input: UpdateRequirementRequest,
  ): Promise<RequirementDetail> {
    const body = updateRequirementRequestSchema.parse(input);
    return this.request(
      `/api/v1/requirements/${encodeURIComponent(publicId)}`,
      requirementDetailSchema,
      {
        method: 'PATCH',
        body: JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
      },
    );
  }

  async publishRequirement(publicId: string): Promise<RequirementDetail> {
    return this.request(
      `/api/v1/requirements/${encodeURIComponent(publicId)}/publish`,
      requirementDetailSchema,
      { method: 'POST' },
    );
  }

  async pauseRequirement(publicId: string): Promise<RequirementDetail> {
    return this.request(
      `/api/v1/requirements/${encodeURIComponent(publicId)}/pause`,
      requirementDetailSchema,
      { method: 'POST' },
    );
  }

  async closeRequirement(publicId: string): Promise<RequirementDetail> {
    return this.request(
      `/api/v1/requirements/${encodeURIComponent(publicId)}/close`,
      requirementDetailSchema,
      { method: 'POST' },
    );
  }

  async listPublicRequirements(
    query: Partial<PublicRequirementListQuery> = {},
  ): Promise<PublicRequirementListResponse> {
    const parsed = publicRequirementListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    const qs = params.toString();
    return this.request(
      `/api/v1/public/requirements${qs ? `?${qs}` : ''}`,
      publicRequirementListResponseSchema,
    );
  }

  async getPublicRequirement(publicId: string): Promise<PublicRequirementDetail> {
    return this.request(
      `/api/v1/public/requirements/${encodeURIComponent(publicId)}`,
      publicRequirementDetailSchema,
    );
  }

  async createMarketplaceLead(input: CreateMarketplaceLeadRequest): Promise<LeadSummary> {
    const body = createMarketplaceLeadRequestSchema.parse(input);
    return this.request('/api/v1/leads/from-requirement', leadSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listLeads(query: LeadListQuery): Promise<LeadListResponse> {
    const parsed = leadListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(`/api/v1/leads?${params.toString()}`, leadListResponseSchema);
  }

  async getLead(publicId: string): Promise<LeadSummary> {
    return this.request(`/api/v1/leads/${encodeURIComponent(publicId)}`, leadSummarySchema);
  }

  async updateLeadStatus(publicId: string, input: UpdateLeadStatusRequest): Promise<LeadSummary> {
    const body = updateLeadStatusRequestSchema.parse(input);
    return this.request(`/api/v1/leads/${encodeURIComponent(publicId)}/status`, leadSummarySchema, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async listAdminRequirements(
    query: Partial<AdminRequirementListQuery> = {},
  ): Promise<AdminRequirementListResponse> {
    const parsed = adminRequirementListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(
      `/api/v1/admin/requirements?${params.toString()}`,
      adminRequirementListResponseSchema,
    );
  }

  async listAdminLeads(query: Partial<AdminLeadListQuery> = {}): Promise<AdminLeadListResponse> {
    const parsed = adminLeadListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(`/api/v1/admin/leads?${params.toString()}`, adminLeadListResponseSchema);
  }

  async getCrmOverview(query: CrmOverviewQuery): Promise<CrmOverview> {
    const parsed = crmOverviewQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(`/api/v1/crm/overview?${params.toString()}`, crmOverviewSchema);
  }

  async listCrmContacts(
    query: Partial<CrmContactListQuery> & Pick<CrmContactListQuery, 'organizationPublicId'>,
  ): Promise<CrmContactListResponse> {
    const parsed = crmContactListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(`/api/v1/crm/contacts?${params.toString()}`, crmContactListResponseSchema);
  }

  async getCrmContact(publicId: string): Promise<CrmContactSummary> {
    return this.request(
      `/api/v1/crm/contacts/${encodeURIComponent(publicId)}`,
      crmContactSummarySchema,
    );
  }

  async createCrmContact(input: CreateCrmContactRequest): Promise<CrmContactSummary> {
    const body = createCrmContactRequestSchema.parse(input);
    return this.request('/api/v1/crm/contacts', crmContactSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listCrmLeads(
    query: Partial<CrmLeadListQuery> & Pick<CrmLeadListQuery, 'organizationPublicId'>,
  ): Promise<CrmLeadListResponse> {
    const parsed = crmLeadListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(`/api/v1/crm/leads?${params.toString()}`, crmLeadListResponseSchema);
  }

  async getCrmLeadDetail(publicId: string): Promise<CrmLeadDetail> {
    return this.request(`/api/v1/crm/leads/${encodeURIComponent(publicId)}`, crmLeadDetailSchema);
  }

  async assignCrmLead(publicId: string, input: AssignCrmLeadRequest): Promise<CrmLeadSummary> {
    const body = assignCrmLeadRequestSchema.parse(input);
    return this.request(
      `/api/v1/crm/leads/${encodeURIComponent(publicId)}/assign`,
      crmLeadSummarySchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async updateCrmLeadStatus(
    publicId: string,
    input: UpdateCrmLeadStatusRequest,
  ): Promise<CrmLeadSummary> {
    const body = updateCrmLeadStatusRequestSchema.parse(input);
    return this.request(
      `/api/v1/crm/leads/${encodeURIComponent(publicId)}/status`,
      crmLeadSummarySchema,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }

  async listCrmFollowUps(
    query: Partial<CrmFollowUpListQuery> & Pick<CrmFollowUpListQuery, 'organizationPublicId'>,
  ): Promise<CrmFollowUpListResponse> {
    const parsed = crmFollowUpListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(
      `/api/v1/crm/follow-ups?${params.toString()}`,
      crmFollowUpListResponseSchema,
    );
  }

  async createCrmFollowUp(input: CreateCrmFollowUpRequest): Promise<CrmFollowUpSummary> {
    const body = createCrmFollowUpRequestSchema.parse(input);
    return this.request('/api/v1/crm/follow-ups', crmFollowUpSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateCrmFollowUp(
    publicId: string,
    input: UpdateCrmFollowUpRequest,
  ): Promise<CrmFollowUpSummary> {
    const body = updateCrmFollowUpRequestSchema.parse(input);
    return this.request(
      `/api/v1/crm/follow-ups/${encodeURIComponent(publicId)}`,
      crmFollowUpSummarySchema,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }

  async listCrmSiteVisits(
    query: Partial<CrmSiteVisitListQuery> & Pick<CrmSiteVisitListQuery, 'organizationPublicId'>,
  ): Promise<CrmSiteVisitListResponse> {
    const parsed = crmSiteVisitListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(
      `/api/v1/crm/site-visits?${params.toString()}`,
      crmSiteVisitListResponseSchema,
    );
  }

  async createCrmSiteVisit(input: CreateCrmSiteVisitRequest): Promise<CrmSiteVisitSummary> {
    const body = createCrmSiteVisitRequestSchema.parse(input);
    return this.request('/api/v1/crm/site-visits', crmSiteVisitSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateCrmSiteVisit(
    publicId: string,
    input: UpdateCrmSiteVisitRequest,
  ): Promise<CrmSiteVisitSummary> {
    const body = updateCrmSiteVisitRequestSchema.parse(input);
    return this.request(
      `/api/v1/crm/site-visits/${encodeURIComponent(publicId)}`,
      crmSiteVisitSummarySchema,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }

  async listCrmDeals(
    query: Partial<CrmDealListQuery> & Pick<CrmDealListQuery, 'organizationPublicId'>,
  ): Promise<CrmDealListResponse> {
    const parsed = crmDealListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(`/api/v1/crm/deals?${params.toString()}`, crmDealListResponseSchema);
  }

  async createCrmDeal(input: CreateCrmDealRequest): Promise<CrmDealSummary> {
    const body = createCrmDealRequestSchema.parse(input);
    return this.request('/api/v1/crm/deals', crmDealSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    });
  }

  async updateCrmDeal(publicId: string, input: UpdateCrmDealRequest): Promise<CrmDealSummary> {
    const body = updateCrmDealRequestSchema.parse(input);
    return this.request(`/api/v1/crm/deals/${encodeURIComponent(publicId)}`, crmDealSummarySchema, {
      method: 'PATCH',
      body: JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    });
  }

  async listCrmActivities(
    query: Partial<CrmActivityListQuery> & Pick<CrmActivityListQuery, 'organizationPublicId'>,
  ): Promise<CrmActivityListResponse> {
    const parsed = crmActivityListQuerySchema.parse(query);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    return this.request(
      `/api/v1/crm/activities?${params.toString()}`,
      crmActivityListResponseSchema,
    );
  }

  async createCrmActivity(input: CreateCrmActivityRequest): Promise<CrmActivitySummary> {
    const body = createCrmActivityRequestSchema.parse(input);
    return this.request('/api/v1/crm/activities', crmActivitySummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listSubscriptionPlans(
    query: SubscriptionPlanListQuery = { limit: 20 },
  ): Promise<SubscriptionPlanListResponse> {
    const parsed = subscriptionPlanListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.active !== undefined) params.set('active', String(parsed.active));
    return this.request(
      `/api/v1/subscriptions/plans?${params.toString()}`,
      subscriptionPlanListResponseSchema,
    );
  }

  async getBillingOverview(query: BillingOverviewQuery): Promise<BillingOverview> {
    const parsed = billingOverviewQuerySchema.parse(query);
    return this.request(
      `/api/v1/billing/overview?organizationPublicId=${encodeURIComponent(parsed.organizationPublicId)}`,
      billingOverviewSchema,
    );
  }

  async getCurrentSubscription(
    organizationPublicId: string,
  ): Promise<OrganizationSubscriptionSummary | null> {
    return this.request(
      `/api/v1/subscriptions/current?organizationPublicId=${encodeURIComponent(organizationPublicId)}`,
      organizationSubscriptionSummarySchema.nullable(),
    );
  }

  async createOrganizationSubscription(
    input: CreateOrganizationSubscriptionRequest,
  ): Promise<OrganizationSubscriptionSummary> {
    const body = createOrganizationSubscriptionRequestSchema.parse(input);
    return this.request('/api/v1/subscriptions', organizationSubscriptionSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async cancelOrganizationSubscription(
    input: CancelOrganizationSubscriptionRequest,
  ): Promise<OrganizationSubscriptionSummary> {
    const body = cancelOrganizationSubscriptionRequestSchema.parse(input);
    return this.request('/api/v1/subscriptions/cancel', organizationSubscriptionSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getWallet(organizationPublicId: string): Promise<WalletSummary> {
    return this.request(
      `/api/v1/wallet?organizationPublicId=${encodeURIComponent(organizationPublicId)}`,
      walletSummarySchema,
    );
  }

  async listWalletLedger(query: WalletLedgerListQuery): Promise<WalletLedgerListResponse> {
    const parsed = walletLedgerListQuerySchema.parse(query);
    const params = new URLSearchParams({
      organizationPublicId: parsed.organizationPublicId,
      limit: String(parsed.limit),
    });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.entryType) params.set('entryType', parsed.entryType);
    return this.request(
      `/api/v1/wallet/ledger?${params.toString()}`,
      walletLedgerListResponseSchema,
    );
  }

  async topUpWallet(input: WalletTopUpRequest): Promise<WalletTopUpResponse> {
    const body = walletTopUpRequestSchema.parse(input);
    return this.request('/api/v1/wallet/topup', walletTopUpResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listPayments(
    query: FinancialTransactionListQuery,
  ): Promise<FinancialTransactionListResponse> {
    const parsed = financialTransactionListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.organizationPublicId)
      params.set('organizationPublicId', parsed.organizationPublicId);
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.type) params.set('type', parsed.type);
    if (parsed.status) params.set('status', parsed.status);
    return this.request(
      `/api/v1/payments?${params.toString()}`,
      financialTransactionListResponseSchema,
    );
  }

  async getPayment(
    publicId: string,
    organizationPublicId: string,
  ): Promise<FinancialTransactionSummary> {
    return this.request(
      `/api/v1/payments/${encodeURIComponent(publicId)}?organizationPublicId=${encodeURIComponent(organizationPublicId)}`,
      financialTransactionSummarySchema,
    );
  }

  async createRefund(input: CreateRefundRequest): Promise<RefundSummary> {
    const body = createRefundRequestSchema.parse(input);
    return this.request('/api/v1/payments/refunds', refundSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listInvoices(query: InvoiceListQuery): Promise<InvoiceListResponse> {
    const parsed = invoiceListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.organizationPublicId)
      params.set('organizationPublicId', parsed.organizationPublicId);
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.status) params.set('status', parsed.status);
    return this.request(`/api/v1/invoices?${params.toString()}`, invoiceListResponseSchema);
  }

  async getInvoice(publicId: string, organizationPublicId: string): Promise<InvoiceSummary> {
    return this.request(
      `/api/v1/invoices/${encodeURIComponent(publicId)}?organizationPublicId=${encodeURIComponent(organizationPublicId)}`,
      invoiceSummarySchema,
    );
  }

  async purchaseLead(input: CreateLeadPurchaseRequest): Promise<LeadPurchaseSummary> {
    const body = createLeadPurchaseRequestSchema.parse(input);
    return this.request('/api/v1/lead-purchases', leadPurchaseSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async adminCreateSubscriptionPlan(
    input: CreateSubscriptionPlanRequest,
  ): Promise<SubscriptionPlanSummary> {
    const body = createSubscriptionPlanRequestSchema.parse(input);
    return this.request('/api/v1/admin/subscriptions/plans', subscriptionPlanSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async adminUpdateSubscriptionPlan(
    publicId: string,
    input: UpdateSubscriptionPlanRequest,
  ): Promise<SubscriptionPlanSummary> {
    const body = updateSubscriptionPlanRequestSchema.parse(input);
    return this.request(
      `/api/v1/admin/subscriptions/plans/${encodeURIComponent(publicId)}`,
      subscriptionPlanSummarySchema,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }

  async adminListSubscriptions(
    query: AdminSubscriptionListQuery = { limit: 20 },
  ): Promise<AdminSubscriptionListResponse> {
    const parsed = adminSubscriptionListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.organizationPublicId)
      params.set('organizationPublicId', parsed.organizationPublicId);
    if (parsed.status) params.set('status', parsed.status);
    return this.request(
      `/api/v1/admin/subscriptions?${params.toString()}`,
      adminSubscriptionListResponseSchema,
    );
  }

  async adminListPayments(
    query: FinancialTransactionListQuery = { limit: 20 },
  ): Promise<FinancialTransactionListResponse> {
    const parsed = financialTransactionListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.organizationPublicId)
      params.set('organizationPublicId', parsed.organizationPublicId);
    if (parsed.type) params.set('type', parsed.type);
    if (parsed.status) params.set('status', parsed.status);
    return this.request(
      `/api/v1/admin/payments?${params.toString()}`,
      financialTransactionListResponseSchema,
    );
  }

  async adminListInvoices(query: InvoiceListQuery = { limit: 20 }): Promise<InvoiceListResponse> {
    const parsed = invoiceListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.organizationPublicId)
      params.set('organizationPublicId', parsed.organizationPublicId);
    if (parsed.status) params.set('status', parsed.status);
    return this.request(`/api/v1/admin/invoices?${params.toString()}`, invoiceListResponseSchema);
  }

  async adminListWallets(
    query: AdminWalletListQuery = { limit: 20 },
  ): Promise<AdminWalletListResponse> {
    const parsed = adminWalletListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.organizationPublicId)
      params.set('organizationPublicId', parsed.organizationPublicId);
    return this.request(
      `/api/v1/admin/wallets?${params.toString()}`,
      adminWalletListResponseSchema,
    );
  }

  async listVerificationCases(
    query: VerificationCaseListQuery = { limit: 20 },
  ): Promise<VerificationCaseListResponse> {
    const parsed = verificationCaseListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.organizationPublicId)
      params.set('organizationPublicId', parsed.organizationPublicId);
    if (parsed.status) params.set('status', parsed.status);
    if (parsed.subjectType) params.set('subjectType', parsed.subjectType);
    return this.request(
      `/api/v1/verification/cases?${params.toString()}`,
      verificationCaseListResponseSchema,
    );
  }

  async getVerificationCase(publicId: string): Promise<VerificationCaseDetail> {
    return this.request(
      `/api/v1/verification/cases/${encodeURIComponent(publicId)}`,
      verificationCaseDetailSchema,
    );
  }

  async createVerificationCase(
    input: CreateVerificationCaseRequest,
  ): Promise<VerificationCaseDetail> {
    const body = createVerificationCaseRequestSchema.parse(input);
    return this.request('/api/v1/verification/cases', verificationCaseDetailSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateVerificationCase(
    publicId: string,
    input: UpdateVerificationCaseRequest,
  ): Promise<VerificationCaseDetail> {
    const body = updateVerificationCaseRequestSchema.parse(input);
    return this.request(
      `/api/v1/verification/cases/${encodeURIComponent(publicId)}`,
      verificationCaseDetailSchema,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }

  async submitVerificationCase(
    publicId: string,
    input: SubmitVerificationCaseRequest,
  ): Promise<VerificationCaseDetail> {
    const body = submitVerificationCaseRequestSchema.parse(input);
    return this.request(
      `/api/v1/verification/cases/${encodeURIComponent(publicId)}/submit`,
      verificationCaseDetailSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async listVerificationDocuments(casePublicId: string): Promise<VerificationDocumentSummary[]> {
    const detail = await this.getVerificationCase(casePublicId);
    return detail.documents;
  }

  async addVerificationDocument(
    casePublicId: string,
    input: AttachVerificationDocumentRequest,
  ): Promise<VerificationDocumentSummary> {
    const body = attachVerificationDocumentRequestSchema.parse(input);
    return this.request(
      `/api/v1/verification/cases/${encodeURIComponent(casePublicId)}/documents`,
      verificationDocumentSummarySchema,
      {
        method: 'POST',
        body: JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
      },
    );
  }

  async updateVerificationDocument(
    casePublicId: string,
    documentPublicId: string,
    input: UpdateVerificationDocumentRequest,
  ): Promise<VerificationDocumentSummary> {
    const body = updateVerificationDocumentRequestSchema.parse(input);
    return this.request(
      `/api/v1/verification/cases/${encodeURIComponent(casePublicId)}/documents/${encodeURIComponent(documentPublicId)}`,
      verificationDocumentSummarySchema,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }

  async getVerificationDocumentAccess(
    casePublicId: string,
    documentPublicId: string,
  ): Promise<VerificationDocumentAccess> {
    return this.request(
      `/api/v1/verification/cases/${encodeURIComponent(casePublicId)}/documents/${encodeURIComponent(documentPublicId)}/access`,
      verificationDocumentAccessSchema,
    );
  }

  async adminListVerificationCases(
    query: AdminVerificationCaseListQuery = { limit: 20 },
  ): Promise<VerificationCaseListResponse> {
    const parsed = adminVerificationCaseListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.status) params.set('status', parsed.status);
    if (parsed.subjectType) params.set('subjectType', parsed.subjectType);
    if (parsed.organizationPublicId)
      params.set('organizationPublicId', parsed.organizationPublicId);
    return this.request(
      `/api/v1/admin/verification?${params.toString()}`,
      verificationCaseListResponseSchema,
    );
  }

  async adminGetVerificationCase(publicId: string): Promise<VerificationCaseDetail> {
    return this.request(
      `/api/v1/admin/verification/${encodeURIComponent(publicId)}`,
      verificationCaseDetailSchema,
    );
  }

  async approveVerificationCase(
    publicId: string,
    input: ReviewVerificationCaseRequest = {},
  ): Promise<VerificationCaseDetail> {
    const body = reviewVerificationCaseRequestSchema.parse(input);
    return this.request(
      `/api/v1/admin/verification/${encodeURIComponent(publicId)}/approve`,
      verificationCaseDetailSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async rejectVerificationCase(
    publicId: string,
    input: ReviewVerificationCaseRequest = {},
  ): Promise<VerificationCaseDetail> {
    const body = reviewVerificationCaseRequestSchema.parse(input);
    return this.request(
      `/api/v1/admin/verification/${encodeURIComponent(publicId)}/reject`,
      verificationCaseDetailSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async requestVerificationChanges(
    publicId: string,
    input: ReviewVerificationCaseRequest = {},
  ): Promise<VerificationCaseDetail> {
    const body = reviewVerificationCaseRequestSchema.parse(input);
    return this.request(
      `/api/v1/admin/verification/${encodeURIComponent(publicId)}/request-changes`,
      verificationCaseDetailSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async revokeVerificationCase(
    publicId: string,
    input: ReviewVerificationCaseRequest = {},
  ): Promise<VerificationCaseDetail> {
    const body = reviewVerificationCaseRequestSchema.parse(input);
    return this.request(
      `/api/v1/admin/verification/${encodeURIComponent(publicId)}/revoke`,
      verificationCaseDetailSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async createReview(input: CreateReviewRequest): Promise<ReviewSummary> {
    const body = createReviewRequestSchema.parse(input);
    return this.request('/api/v1/reviews', reviewSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listReviews(query: ReviewListQuery = { limit: 20 }): Promise<ReviewListResponse> {
    const parsed = reviewListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.subjectType) params.set('subjectType', parsed.subjectType);
    if (parsed.subjectPublicId) params.set('subjectPublicId', parsed.subjectPublicId);
    if (parsed.status) params.set('status', parsed.status);
    if (parsed.organizationPublicId)
      params.set('organizationPublicId', parsed.organizationPublicId);
    return this.request(`/api/v1/reviews?${params.toString()}`, reviewListResponseSchema);
  }

  async getReview(publicId: string): Promise<ReviewSummary> {
    return this.request(`/api/v1/reviews/${encodeURIComponent(publicId)}`, reviewSummarySchema);
  }

  async updateOwnReview(publicId: string, input: UpdateOwnReviewRequest): Promise<ReviewSummary> {
    const body = updateOwnReviewRequestSchema.parse(input);
    return this.request(`/api/v1/reviews/${encodeURIComponent(publicId)}`, reviewSummarySchema, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async reportReview(publicId: string, input: ReportReviewRequest): Promise<ReviewReportSummary> {
    const body = reportReviewRequestSchema.parse(input);
    return this.request(
      `/api/v1/reviews/${encodeURIComponent(publicId)}/report`,
      reviewReportSummarySchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async moderateReview(publicId: string, input: ModerateReviewRequest): Promise<ReviewSummary> {
    const body = moderateReviewRequestSchema.parse(input);
    return this.request(
      `/api/v1/admin/reviews/${encodeURIComponent(publicId)}/moderate`,
      reviewSummarySchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async getTrustScore(
    subjectType: ReviewSubjectType,
    subjectPublicId: string,
  ): Promise<TrustScoreResponse> {
    const params = new URLSearchParams({ subjectType, subjectPublicId });
    return this.request(
      `/api/v1/reviews/trust-score?${params.toString()}`,
      trustScoreResponseSchema,
    );
  }

  async adminListReviews(query: ReviewListQuery = { limit: 20 }): Promise<ReviewListResponse> {
    return this.listReviews(query);
  }

  async adminListFlaggedReviews(
    query: Omit<ReviewListQuery, 'status'> = { limit: 20 },
  ): Promise<ReviewListResponse> {
    return this.listReviews({ ...query, status: 'FLAGGED' });
  }

  async adminListReports(
    query: AdminReportListQuery = { limit: 20 },
  ): Promise<AdminReportListResponse> {
    const parsed = adminReportListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.status) params.set('status', parsed.status);
    if (parsed.entityType) params.set('entityType', parsed.entityType);
    return this.request(
      `/api/v1/admin/reports?${params.toString()}`,
      adminReportListResponseSchema,
    );
  }

  async listNotifications(
    query: NotificationListQuery = { limit: 20 },
  ): Promise<NotificationListResponse> {
    const parsed = notificationListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.unreadOnly !== undefined) params.set('unreadOnly', String(parsed.unreadOnly));
    return this.request(
      `/api/v1/notifications?${params.toString()}`,
      notificationListResponseSchema,
    );
  }

  async markNotificationRead(publicId: string): Promise<NotificationSummary> {
    return this.request(
      `/api/v1/notifications/${encodeURIComponent(publicId)}/read`,
      notificationSummarySchema,
      { method: 'POST', body: JSON.stringify({}) },
    );
  }

  async markAllNotificationsRead(): Promise<OkResponse> {
    return this.request('/api/v1/notifications/read-all', okResponseSchema, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
    return this.request('/api/v1/notifications/preferences', notificationPreferencesResponseSchema);
  }

  async updateNotificationPreferences(
    input: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreferencesResponse> {
    const body = updateNotificationPreferencesRequestSchema.parse(input);
    return this.request(
      '/api/v1/notifications/preferences',
      notificationPreferencesResponseSchema,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
  }

  async listConversations(
    query: ConversationListQuery = { limit: 20 },
  ): Promise<ConversationListResponse> {
    const parsed = conversationListQuerySchema.parse(query);
    const params = new URLSearchParams({ limit: String(parsed.limit) });
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    if (parsed.organizationPublicId)
      params.set('organizationPublicId', parsed.organizationPublicId);
    if (parsed.type) params.set('type', parsed.type);
    return this.request(
      `/api/v1/conversations?${params.toString()}`,
      conversationListResponseSchema,
    );
  }

  async getConversation(publicId: string): Promise<ConversationDetail> {
    return this.request(
      `/api/v1/conversations/${encodeURIComponent(publicId)}`,
      conversationDetailSchema,
    );
  }

  async createConversation(input: CreateConversationRequest): Promise<ConversationSummary> {
    const body = createConversationRequestSchema.parse(input);
    return this.request('/api/v1/conversations', conversationSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listMessages(conversationPublicId: string): Promise<MessageSummary[]> {
    const detail = await this.getConversation(conversationPublicId);
    return detail.messages;
  }

  async sendMessage(
    conversationPublicId: string,
    input: SendMessageRequest,
  ): Promise<MessageSummary> {
    const body = sendMessageRequestSchema.parse(input);
    return this.request(
      `/api/v1/conversations/${encodeURIComponent(conversationPublicId)}/messages`,
      messageSummarySchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  async markConversationRead(conversationPublicId: string): Promise<ConversationSummary> {
    return this.request(
      `/api/v1/conversations/${encodeURIComponent(conversationPublicId)}/read`,
      conversationSummarySchema,
      { method: 'POST', body: JSON.stringify({}) },
    );
  }

  async getLeadAccess(leadPublicId: string, query: LeadAccessQuery): Promise<LeadAccessStatus> {
    const parsed = leadAccessQuerySchema.parse(query);
    const params = new URLSearchParams({
      organizationPublicId: parsed.organizationPublicId,
    });
    return this.request(
      `/api/v1/leads/${encodeURIComponent(leadPublicId)}/access?${params.toString()}`,
      leadAccessStatusSchema,
    );
  }

  async revealLeadContact(
    leadPublicId: string,
    input: LeadAccessQuery,
  ): Promise<LeadContactRevealResponse> {
    const body = leadAccessQuerySchema.parse(input);
    return this.request(
      `/api/v1/leads/${encodeURIComponent(leadPublicId)}/contact`,
      leadContactRevealResponseSchema,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  // --- Phase 11: intelligence ---

  async getPropertyIntelligence(publicId: string): Promise<PropertyIntelligenceDetail> {
    return this.request(
      `/api/v1/intelligence/properties/${encodeURIComponent(publicId)}`,
      propertyIntelligenceDetailSchema,
    );
  }

  async getProjectIntelligence(publicId: string): Promise<ProjectIntelligenceDetail> {
    return this.request(
      `/api/v1/intelligence/projects/${encodeURIComponent(publicId)}`,
      projectIntelligenceDetailSchema,
    );
  }

  async listMarketSnapshots(
    query: Partial<MarketQuery> = {},
  ): Promise<MarketSnapshotListResponse> {
    const parsed = marketQuerySchema.parse(query);
    const params = new URLSearchParams();
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    params.set('limit', String(parsed.limit));
    if (parsed.city) params.set('city', parsed.city);
    if (parsed.locality) params.set('locality', parsed.locality);
    if (parsed.microMarket) params.set('microMarket', parsed.microMarket);
    if (parsed.subjectType) params.set('subjectType', parsed.subjectType);
    if (parsed.subjectKey) params.set('subjectKey', parsed.subjectKey);
    if (parsed.propertyPublicId) params.set('propertyPublicId', parsed.propertyPublicId);
    if (parsed.projectPublicId) params.set('projectPublicId', parsed.projectPublicId);
    return this.request(
      `/api/v1/intelligence/market?${params.toString()}`,
      marketSnapshotListResponseSchema,
    );
  }

  async getMarketTrend(query: Partial<MarketQuery> = {}): Promise<MarketTrendResponse> {
    const parsed = marketQuerySchema.parse(query);
    const params = new URLSearchParams();
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    params.set('limit', String(parsed.limit));
    if (parsed.city) params.set('city', parsed.city);
    if (parsed.locality) params.set('locality', parsed.locality);
    if (parsed.microMarket) params.set('microMarket', parsed.microMarket);
    if (parsed.subjectType) params.set('subjectType', parsed.subjectType);
    if (parsed.subjectKey) params.set('subjectKey', parsed.subjectKey);
    if (parsed.propertyPublicId) params.set('propertyPublicId', parsed.propertyPublicId);
    if (parsed.projectPublicId) params.set('projectPublicId', parsed.projectPublicId);
    return this.request(
      `/api/v1/intelligence/market/trend?${params.toString()}`,
      marketTrendResponseSchema,
    );
  }

  async listInfrastructure(
    query: Partial<InfrastructureQuery> = {},
  ): Promise<InfrastructureListResponse> {
    const parsed = infrastructureQuerySchema.parse(query);
    const params = new URLSearchParams();
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    params.set('limit', String(parsed.limit));
    if (parsed.city) params.set('city', parsed.city);
    if (parsed.locality) params.set('locality', parsed.locality);
    if (parsed.category) params.set('category', parsed.category);
    if (parsed.status) params.set('status', parsed.status);
    return this.request(
      `/api/v1/intelligence/infrastructure?${params.toString()}`,
      infrastructureListResponseSchema,
    );
  }

  async compareIntelligence(
    input: IntelligenceCompareRequest,
  ): Promise<IntelligenceCompareResponse> {
    const body = intelligenceCompareRequestSchema.parse(input);
    return this.request('/api/v1/intelligence/compare', intelligenceCompareResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async matchIntelligence(input: IntelligenceMatchRequest): Promise<IntelligenceMatchResponse> {
    const body = intelligenceMatchRequestSchema.parse(input);
    return this.request('/api/v1/intelligence/match', intelligenceMatchResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listAdminMarketSnapshots(
    query: Partial<MarketQuery> = {},
  ): Promise<MarketSnapshotListResponse> {
    const parsed = marketQuerySchema.parse(query);
    const params = new URLSearchParams();
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    params.set('limit', String(parsed.limit));
    if (parsed.city) params.set('city', parsed.city);
    if (parsed.locality) params.set('locality', parsed.locality);
    if (parsed.microMarket) params.set('microMarket', parsed.microMarket);
    if (parsed.subjectType) params.set('subjectType', parsed.subjectType);
    if (parsed.subjectKey) params.set('subjectKey', parsed.subjectKey);
    if (parsed.propertyPublicId) params.set('propertyPublicId', parsed.propertyPublicId);
    if (parsed.projectPublicId) params.set('projectPublicId', parsed.projectPublicId);
    return this.request(
      `/api/v1/admin/intelligence/market?${params.toString()}`,
      marketSnapshotListResponseSchema,
    );
  }

  async listAdminInfrastructure(
    query: Partial<InfrastructureQuery> = {},
  ): Promise<InfrastructureListResponse> {
    const parsed = infrastructureQuerySchema.parse(query);
    const params = new URLSearchParams();
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    params.set('limit', String(parsed.limit));
    if (parsed.city) params.set('city', parsed.city);
    if (parsed.locality) params.set('locality', parsed.locality);
    if (parsed.category) params.set('category', parsed.category);
    if (parsed.status) params.set('status', parsed.status);
    return this.request(
      `/api/v1/admin/intelligence/infrastructure?${params.toString()}`,
      infrastructureListResponseSchema,
    );
  }

  async listAdminIntelligenceObservations(
    query: Partial<IntelligenceObservationListQuery> = {},
  ): Promise<IntelligenceObservationListResponse> {
    const parsed = intelligenceObservationListQuerySchema.parse(query);
    const params = new URLSearchParams();
    if (parsed.cursor) params.set('cursor', parsed.cursor);
    params.set('limit', String(parsed.limit));
    if (parsed.subjectType) params.set('subjectType', parsed.subjectType);
    if (parsed.subjectKey) params.set('subjectKey', parsed.subjectKey);
    if (parsed.observationKey) params.set('observationKey', parsed.observationKey);
    return this.request(
      `/api/v1/admin/intelligence/observations?${params.toString()}`,
      intelligenceObservationListResponseSchema,
    );
  }

  // --- Phase 11: AI ---

  async aiAssistant(input: AiAssistantRequest): Promise<AiAssistantResponse> {
    const body = aiAssistantRequestSchema.parse(input);
    return this.request('/api/v1/ai/assistant', aiAssistantResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async aiPropertyMatch(input: AiPropertyMatchRequest): Promise<AiPropertyMatchResponse> {
    const body = aiPropertyMatchRequestSchema.parse(input);
    return this.request('/api/v1/ai/property-match', aiPropertyMatchResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async aiDocumentAnalysis(
    input: AiDocumentAnalysisRequest,
  ): Promise<AiDocumentAnalysisResponse> {
    const body = aiDocumentAnalysisRequestSchema.parse(input);
    return this.request('/api/v1/ai/document-analysis', aiDocumentAnalysisResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async aiFloorPlanAnalysis(
    input: AiFloorPlanAnalysisRequest,
  ): Promise<AiFloorPlanAnalysisResponse> {
    const body = aiFloorPlanAnalysisRequestSchema.parse(input);
    return this.request('/api/v1/ai/floorplan-analysis', aiFloorPlanAnalysisResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async aiValuation(input: AiValuationRequest): Promise<AiValuationResponse> {
    const body = aiValuationRequestSchema.parse(input);
    return this.request('/api/v1/ai/valuation', aiValuationResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async aiPropertySearch(input: AiPropertySearchRequest): Promise<AiPropertySearchResponse> {
    const body = aiPropertySearchRequestSchema.parse(input);
    return this.request('/api/v1/ai/property-search', aiPropertySearchResponseSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getAiJob(publicId: string): Promise<AiJobSummary> {
    return this.request(`/api/v1/ai/jobs/${encodeURIComponent(publicId)}`, aiJobSummarySchema);
  }

  private async request<T>(
    path: string,
    schema: { parse: (data: unknown) => T },
    init?: RequestInit,
  ): Promise<T> {
    const headers = new Headers(this.defaultHeaders);
    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'PropertyStudioWeb');
    if (init?.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (init?.headers) {
      const extra = new Headers(init.headers);
      extra.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: this.credentials ?? init?.credentials,
    });

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const parsedError = apiErrorBodySchema.safeParse(body);
      if (parsedError.success) {
        throw new ApiClientError(
          parsedError.data.error.message,
          response.status,
          parsedError.data.error.code,
          parsedError.data.error.requestId,
        );
      }

      throw new ApiClientError('Unexpected API error', response.status, 'INTERNAL_ERROR');
    }

    return schema.parse(body);
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}
