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
        headers: expect.objectContaining({
          Accept: 'application/json',
        }),
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
});
