import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'ps_session';
const HOST_SESSION_COOKIE = '__Host-ps_session';

function hasSession(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get(SESSION_COOKIE)?.value || request.cookies.get(HOST_SESSION_COOKIE)?.value,
  );
}

/**
 * UX-only gate. Does not authorize — NestJS remains the security boundary.
 * Presence of a session cookie is a hint to route users toward login when missing.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticatedHint = hasSession(request);

  const isApp = pathname === '/app' || pathname.startsWith('/app/');
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/verify-email';

  if ((isApp || isAdmin) && !authenticatedHint) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && authenticatedHint && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/app/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ],
};
