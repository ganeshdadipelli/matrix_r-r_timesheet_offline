// app/api/v1/entries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { calcInternalSum, calcExternalSum, pct } from '@/lib/utils/calculations';
import { canEditEntry } from '@/lib/utils/editLock';
import { logAction } from '@/lib/audit/logger';
import { getAuthUser } from '@/lib/auth/serverAuth';
import { z } from 'zod';

const nonNeg = z.number().int().min(0);
const updateSchema = z.object({
  totalCount:  nonNeg.optional(),
  onlineCount: nonNeg.optional(),
  offlineCount:nonNeg.optional(),
  cat6Cable: nonNeg.optional(), threeCorepower: nonNeg.optional(),
  gponIssues: nonNeg.optional(), ofcIssues: nonNeg.optional(),
  cameraStoreReplacement: nonNeg.optional(), camerasFluctuating: nonNeg.optional(),
  needToCheck: nonNeg.optional(), fiberRequired: nonNeg.optional(),
  hydraLadder: nonNeg.optional(), mcbIssue: nonNeg.optional(),
  switch8portIssue: nonNeg.optional(),
  roadExtensionConstruction: nonNeg.optional(), noOlt: nonNeg.optional(),
  popDown: nonNeg.optional(), jbAccident: nonNeg.optional(),
  renovation: nonNeg.optional(), powerDisconnection: nonNeg.optional(),
  dgpOffice: nonNeg.optional(), needPeerIp: nonNeg.optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const entry = await prisma.dailyEntry.findUnique({
    where: { id: params.id },
    include: {
      district:  true,
      createdBy: { select: { id:true, name:true, email:true } },
    },
  });
  if (!entry) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: entry });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.dailyEntry.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });

    if (!canEditEntry(existing.createdAt, existing.isLocked, user.role)) {
      return NextResponse.json(
        { success: false, error: 'Entry is locked. 12-hour edit window has passed.' },
        { status: 403 }
      );
    }

    if (user.role === 'FIELD_USER' && existing.districtId !== user.districtId) {
      return NextResponse.json({ success: false, error: 'Not authorized to edit this entry' }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 422 });
    }

    const d = {
      totalCount:   body.totalCount   ?? existing.totalCount,
      onlineCount:  body.onlineCount  ?? existing.onlineCount,
      offlineCount: body.offlineCount ?? existing.offlineCount,
      cat6Cable: body.cat6Cable ?? existing.cat6Cable,
      threeCorepower: body.threeCorepower ?? existing.threeCorepower,
      gponIssues: body.gponIssues ?? existing.gponIssues,
      ofcIssues: body.ofcIssues ?? existing.ofcIssues,
      cameraStoreReplacement: body.cameraStoreReplacement ?? existing.cameraStoreReplacement,
      camerasFluctuating: body.camerasFluctuating ?? existing.camerasFluctuating,
      needToCheck: body.needToCheck ?? existing.needToCheck,
      fiberRequired: body.fiberRequired ?? existing.fiberRequired,
      hydraLadder: body.hydraLadder ?? existing.hydraLadder,
      mcbIssue: body.mcbIssue ?? existing.mcbIssue,
      switch8portIssue: body.switch8portIssue ?? existing.switch8portIssue,
      roadExtensionConstruction: body.roadExtensionConstruction ?? existing.roadExtensionConstruction,
      noOlt: body.noOlt ?? existing.noOlt,
      popDown: body.popDown ?? existing.popDown,
      jbAccident: body.jbAccident ?? existing.jbAccident,
      renovation: body.renovation ?? existing.renovation,
      powerDisconnection: body.powerDisconnection ?? existing.powerDisconnection,
      dgpOffice: body.dgpOffice ?? existing.dgpOffice,
      needPeerIp: body.needPeerIp ?? existing.needPeerIp,
    };

    const internalSum = calcInternalSum(d as any);
    const externalSum = calcExternalSum(d as any);

    const updated = await prisma.dailyEntry.update({
      where: { id: params.id },
      data: {
        ...d,
        onlinePct:  pct(d.onlineCount, d.totalCount),
        offlinePct: pct(d.offlineCount, d.totalCount),
        internalSum, externalSum,
        dependencySum: internalSum + externalSum,
        updatedById: user.userId,
      },
      include: { district: true },
    });

    await logAction({
      userId: user.userId, action: 'UPDATE_ENTRY', resource: 'daily_entries',
      resourceId: params.id, oldData: existing, newData: updated,
      ipAddress: req.headers.get('x-forwarded-for') || '',
      userAgent:  req.headers.get('user-agent') || '',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}