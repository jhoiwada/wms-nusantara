import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './server/auth/session';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isAuthPage = pathname.startsWith('/login');
  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/suppliers') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/warehouses') ||
    pathname.startsWith('/locations') ||
    pathname.startsWith('/goods-receipts') ||
    pathname.startsWith('/delivery-orders') ||
    pathname.startsWith('/stock') ||
    pathname.startsWith('/stock-card') ||
    pathname.startsWith('/stock-opname') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/users');

  if (isProtectedPage && !token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes handle their own auth & 401 JSON)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
