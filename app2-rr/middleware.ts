import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = ['/dashboard', '/team', '/admin', '/rr', '/timesheet', '/timesheet-summary', '/insights', '/kpi', '/offline-entry'];
const AUTH_ROUTES = ['/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('rr_token')?.value;

  const isProtected = PROTECTED.some(route => pathname === route || pathname.startsWith(`${route}/`));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/team/:path*', '/admin/:path*', '/rr/:path*',
    '/timesheet/:path*', '/timesheet-summary/:path*', '/insights/:path*', '/kpi/:path*',
    '/offline-entry/:path*',
    '/login',
  ],
};