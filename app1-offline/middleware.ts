import { NextResponse, type NextRequest } from 'next/server';
export function middleware(r: NextRequest) { return NextResponse.next(); }
export const config = { matcher: [] };
