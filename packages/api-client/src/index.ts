import {
  addOrganizationMemberRequestSchema,
  agencyProfileSchema,
  apiErrorBodySchema,
  authSuccessResponseSchema,
  changePasswordRequestSchema,
  createOrganizationRequestSchema,
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
  publicAgencyProfileSchema,
  publicDeveloperProfileSchema,
  readyResponseSchema,
  registerRequestSchema,
  switchOrganizationResponseSchema,
  updateAgencyProfileRequestSchema,
  updateDeveloperProfileRequestSchema,
  updateOrganizationMemberRequestSchema,
  updateOrganizationRequestSchema,
  type AddOrganizationMemberRequest,
  type AgencyProfile,
  type AuthSuccessResponse,
  type ChangePasswordRequest,
  type CreateOrganizationRequest,
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
  type PublicAgencyProfile,
  type PublicDeveloperProfile,
  type ReadyResponse,
  type RegisterRequest,
  type SwitchOrganizationResponse,
  type UpdateAgencyProfileRequest,
  type UpdateDeveloperProfileRequest,
  type UpdateOrganizationMemberRequest,
  type UpdateOrganizationRequest,
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
