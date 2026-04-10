// app/api/v1/districts/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
  const districts = await prisma.district.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json({ success: true, data: districts });
}
