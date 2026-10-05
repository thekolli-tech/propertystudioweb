import { ApiClientError, createApiClient, type ApiClient } from '@property-studio/api-client';
import type { AuthSuccessResponse, UserSummary } from '@property-studio/contracts';

export { ApiClientError };

const SESSION_COOKIE = 'ps_session';
const HOST_SESSION_COOKIE = '__Host-ps_session';

export function getBrowserApiBaseUrl(): string {
  // Empty string → same-origin (Next.js rewrites → NestJS).
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
}

export function getServerApiBaseUrl(): string {
  return (
    process.env.API_INTERNAL_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:3001'
  );
}

export function createBrowserApiClient(): ApiClient {
  return createApiClient({
    baseUrl: getBrowserApiBaseUrl(),
    credentials: 'include',
  });
}

export function createServerApiClient(cookieHeader?: string | null): ApiClient {
  return createApiClient({
    baseUrl: getServerApiBaseUrl(),
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
}

export function sessionCookieName(cookieHeader: string): string | null {
  if (cookieHeader.includes(`${HOST_SESSION_COOKIE}=`)) {
    return HOST_SESSION_COOKIE;
  }
  if (cookieHeader.includes(`${SESSION_COOKIE}=`)) {
    return SESSION_COOKIE;
  }
  return null;
}

export function hasSessionCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return sessionCookieName(cookieHeader) !== null;
}

export async function fetchCurrentUser(cookieHeader?: string | null): Promise<UserSummary | null> {
  if (!hasSessionCookie(cookieHeader)) {
    return null;
  }

  try {
    const client = createServerApiClient(cookieHeader);
    const response: AuthSuccessResponse = await client.me();
    return response.user;
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}
