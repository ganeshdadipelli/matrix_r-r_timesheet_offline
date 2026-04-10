// app/api/v1/entries/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const districtId = searchParams.get('districtId');
  const days = parseInt(searchParams.get('days') || '30');

  const from = new Date();
  from.setDate(from.getDate() - days);

  const where: Record<string, unknown> = { date: { gte: from } };
  if (districtId) where.districtId = districtId;

  const entries = await prisma.dailyEntry.findMany({
    where,
    include: { district: { select: { name: true, code: true } } },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ success: true, data: entries });
}
