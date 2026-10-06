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
