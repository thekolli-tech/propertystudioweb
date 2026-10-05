import { describe, expect, it, vi } from 'vitest';

import { ApiClient, ApiClientError } from './index';

describe('ApiClient', () => {
  it('parses a successful health response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          service: 'property-studio-api',
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const client = new ApiClient({
      baseUrl: 'http://localhost:3001',
      fetch: fetchMock as unknown as typeof fetch,
    });

    const health = await client.getHealth();
    expect(health.status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/health',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it('throws ApiClientError on structured API failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Redis unavailable',
            requestId: 'req_test',
          },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const client = new ApiClient({
      baseUrl: 'http://localhost:3001',
      fetch: fetchMock as unknown as typeof fetch,
    });

    await expect(client.getReady()).rejects.toBeInstanceOf(ApiClientError);
  });

  it('posts login credentials with credentials include support', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            publicId: 'PS-USER-000001',
            email: 'seeker@example.com',
            emailVerified: false,
            status: 'ACTIVE',
            platformRoles: [],
            personas: [],
            activeOrganizationPublicId: null,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const client = new ApiClient({
      baseUrl: 'http://localhost:3001',
      fetch: fetchMock as unknown as typeof fetch,
      credentials: 'include',
    });

    const result = await client.login({
      email: 'seeker@example.com',
      password: 'password-long-enough',
    });

    expect(result.user.publicId).toBe('PS-USER-000001');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });

  it('calls organization switch endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ activeOrganizationPublicId: 'PS-ORG-000001' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new ApiClient({
      baseUrl: 'http://localhost:3001',
      fetch: fetchMock as unknown as typeof fetch,
      credentials: 'include',
    });

    const result = await client.switchOrganization('PS-ORG-000001');
    expect(result.activeOrganizationPublicId).toBe('PS-ORG-000001');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/organizations/PS-ORG-000001/switch',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('posts logout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = new ApiClient({
      baseUrl: 'http://localhost:3001',
      fetch: fetchMock as unknown as typeof fetch,
      credentials: 'include',
    });

    await expect(client.logout()).resolves.toEqual({ ok: true });
  });
});
