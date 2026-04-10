// middleware.ts
// Auth is now handled inside each API route using cookies() from next/headers
// This middleware only forwards page routes — no auth logic here

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],  // empty = middleware runs on nothing
};