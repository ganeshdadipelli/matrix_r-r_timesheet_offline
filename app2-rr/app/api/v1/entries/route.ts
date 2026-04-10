import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { calcInternalSum, calcExternalSum, pct } from '@/lib/utils/calculations';
import { logAction } from '@/lib/audit/logger';
import { requireUser } from '@/lib/auth/guards';
import { z } from 'zod';

const nonNeg = z.number().int().min(0);

const entrySchema = z.object({
  districtId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalCount: nonNeg,
  onlineCount: nonNeg,
  offlineCount: nonNeg,
  cat6Cable: nonNeg.default(0),
  threeCorepower: nonNeg.default(0),
  gponIssues: nonNeg.default(0),
  ofcIssues: nonNeg.default(0),
  cameraStoreReplacement: nonNeg.default(0),
  camerasFluctuating: nonNeg.default(0),
  needToCheck: nonNeg.default(0),
  fiberRequired: nonNeg.default(0),
  hydraLadder: nonNeg.default(0),
  mcbIssue: nonNeg.default(0),
  switch8portIssue: nonNeg.default(0),
  roadExtensionConstruction: nonNeg.default(0),
  noOlt: nonNeg.default(0),
  popDown: nonNeg.default(0),
  jbAccident: nonNeg.default(0),
  renovation: nonNeg.default(0),
  powerDisconnection: nonNeg.default(0),
  dgpOffice: nonNeg.default(0),
  needPeerIp: nonNeg.default(0),
  customDeps: z.object({
    internal: z.array(z.object({ label: z.string(), value: nonNeg })).default([]),
    external: z.array(z.object({ label: z.string(), value: nonNeg })).default([]),
  }).optional(),
})
.refine(d => d.onlineCount + d.offlineCount === d.totalCount, {
  message: 'Online + Offline must equal Total Count',
})
.refine(d => {
  const intB =
    d.cat6Cable +
    d.threeCorepower +
    d.gponIssues +
    d.ofcIssues +
    d.cameraStoreReplacement +
    d.camerasFluctuating +
    d.needToCheck +
    d.fiberRequired +
    d.hydraLadder +
    d.mcbIssue +
    d.switch8portIssue;

  const extB =
    d.roadExtensionConstruction +
    d.noOlt +
    d.popDown +
    d.jbAccident +
    d.renovation +
    d.powerDisconnection +
    d.dgpOffice +
    d.needPeerIp;

  const cInt = d.customDeps?.internal.reduce((s, r) => s + r.value, 0) || 0;
  const cExt = d.customDeps?.external.reduce((s, r) => s + r.value, 0) || 0;

  return intB + extB + cInt + cExt === d.offlineCount;
}, {
  message: 'Sum of all dependency counts must equal Offline Count',
});

function getTodayStartIST(): Date {
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return new Date(`${today}T00:00:00+05:30`);
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const user = auth.user;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const districtId = searchParams.get('districtId');

  const where: Record<string, unknown> = {};

  if (date) {
    const start = new Date(`${date}T00:00:00+05:30`);
    const end = new Date(`${date}T23:59:59.999+05:30`);
    where.date = { gte: start, lte: end };
  }

  if (districtId) where.districtId = districtId;
  if (user.role === 'FIELD_USER' && user.districtId) where.districtId = user.districtId;

  const entries = await prisma.dailyEntry.findMany({
    where,
    include: {
      district: { select: { id: true, name: true, code: true, sortOrder: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ date: 'desc' }, { district: { sortOrder: 'asc' } }],
  });

  return NextResponse.json({ success: true, data: entries });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const user = auth.user;
    const body = await req.json();

    if (user.role === 'FIELD_USER' && body.districtId !== user.districtId) {
      return NextResponse.json(
        { success: false, error: 'You can only submit data for your assigned district' },
        { status: 403 }
      );
    }

    const parsed = entrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Validation failed',
        details: parsed.error.issues,
      }, { status: 422 });
    }

    const d = parsed.data;
    const entryDate = new Date(`${d.date}T00:00:00+05:30`);
    const todayStart = getTodayStartIST();

    if (entryDate > todayStart) {
      return NextResponse.json(
        { success: false, error: 'Future dates are not allowed. You can submit only past or current date data.' },
        { status: 422 }
      );
    }

    const internalSum =
      calcInternalSum(d as any) +
      (d.customDeps?.internal.reduce((s, r) => s + r.value, 0) || 0);

    const externalSum =
      calcExternalSum(d as any) +
      (d.customDeps?.external.reduce((s, r) => s + r.value, 0) || 0);

    const existing = await prisma.dailyEntry.findUnique({
      where: {
        date_districtId: {
          date: entryDate,
          districtId: d.districtId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Entry already exists for this district and date. Use edit instead.' },
        { status: 409 }
      );
    }

    const entry = await prisma.dailyEntry.create({
      data: {
        date: entryDate,
        districtId: d.districtId,
        totalCount: d.totalCount,
        onlineCount: d.onlineCount,
        offlineCount: d.offlineCount,
        onlinePct: pct(d.onlineCount, d.totalCount),
        offlinePct: pct(d.offlineCount, d.totalCount),
        cat6Cable: d.cat6Cable,
        threeCorepower: d.threeCorepower,
        gponIssues: d.gponIssues,
        ofcIssues: d.ofcIssues,
        cameraStoreReplacement: d.cameraStoreReplacement,
        camerasFluctuating: d.camerasFluctuating,
        needToCheck: d.needToCheck,
        fiberRequired: d.fiberRequired,
        hydraLadder: d.hydraLadder,
        mcbIssue: d.mcbIssue,
        switch8portIssue: d.switch8portIssue,
        roadExtensionConstruction: d.roadExtensionConstruction,
        noOlt: d.noOlt,
        popDown: d.popDown,
        jbAccident: d.jbAccident,
        renovation: d.renovation,
        powerDisconnection: d.powerDisconnection,
        dgpOffice: d.dgpOffice,
        needPeerIp: d.needPeerIp,
        internalSum,
        externalSum,
        dependencySum: internalSum + externalSum,
        isValidated: true,
        createdById: user.userId,
      },
      include: {
        district: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    await logAction({
      userId: user.userId,
      action: 'CREATE_ENTRY',
      resource: 'daily_entries',
      resourceId: entry.id,
      newData: { ...entry, customDeps: d.customDeps },
      ipAddress: req.headers.get('x-forwarded-for') || '',
      userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (e: any) {
    console.error('Create entry error:', e);

    if (e.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Entry already exists for this district and date' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}