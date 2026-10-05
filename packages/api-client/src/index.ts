import {
  apiErrorBodySchema,
  authSuccessResponseSchema,
  changePasswordRequestSchema,
  createOrganizationRequestSchema,
  healthResponseSchema,
  loginRequestSchema,
  okResponseSchema,
  organizationListResponseSchema,
  organizationMembersResponseSchema,
  organizationSummarySchema,
  readyResponseSchema,
  registerRequestSchema,
  switchOrganizationResponseSchema,
  type AuthSuccessResponse,
  type ChangePasswordRequest,
  type CreateOrganizationRequest,
  type HealthResponse,
  type LoginRequest,
  type OkResponse,
  type OrganizationListResponse,
  type OrganizationMembersResponse,
  type OrganizationSummary,
  type ReadyResponse,
  type RegisterRequest,
  type SwitchOrganizationResponse,
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
  /** Extra headers merged into every request (e.g. Cookie for SSR). */
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

  async getOrganization(publicId: string): Promise<OrganizationSummary> {
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(publicId)}`,
      organizationSummarySchema,
    );
  }

  async createOrganization(input: CreateOrganizationRequest): Promise<OrganizationSummary> {
    const body = createOrganizationRequestSchema.parse(input);
    return this.request('/api/v1/organizations', organizationSummarySchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
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

  async listOrganizationMembers(publicId: string): Promise<OrganizationMembersResponse> {
    return this.request(
      `/api/v1/organizations/${encodeURIComponent(publicId)}/members`,
      organizationMembersResponseSchema,
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
