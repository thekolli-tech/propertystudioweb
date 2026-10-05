import { cookies } from 'next/headers';

import { fetchCurrentUser, hasSessionCookie } from './api';
import type { UserSummary } from '@property-studio/contracts';

export async function getRequestCookieHeader(): Promise<string | null> {
  const jar = await cookies();
  const pairs = jar.getAll().map((entry) => `${entry.name}=${entry.value}`);
  return pairs.length > 0 ? pairs.join('; ') : null;
}

export async function getSessionUser(): Promise<UserSummary | null> {
  const cookieHeader = await getRequestCookieHeader();
  if (!hasSessionCookie(cookieHeader)) {
    return null;
  }
  return fetchCurrentUser(cookieHeader);
}

export async function requireSessionUser(): Promise<UserSummary | null> {
  return getSessionUser();
}
