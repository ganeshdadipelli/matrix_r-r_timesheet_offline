import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/serverAuth';

async function canAccessUser(auth: NonNullable<ReturnType<typeof getAuthUser>>, targetUserId: string) {
  if (auth.role === 'SUPER_ADMIN') return true;
  if (auth.userId === targetUserId) return true;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, parentId: true, role: true },
  });

  if (!target) return false;

  if (auth.role === 'MANAGER') {
    return target.role === 'TEAM_MEMBER' && target.parentId === auth.userId;
  }

  if (auth.role === 'SUPER_BOSS') {
    if (target.parentId === auth.userId) return true;

    const parent = target.parentId
      ? await prisma.user.findUnique({
          where: { id: target.parentId },
          select: { parentId: true },
        })
      : null;

    return parent?.parentId === auth.userId;
  }

  return false;
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser();

  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || auth.userId;

  const allowed = await canAccessUser(auth, userId);

  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const items = await prisma.rRCategory.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({ success: true, data: items });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser();

  if (!auth || auth.role === 'TEAM_MEMBER') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();

    const userId = String(body.userId || auth.userId);
    const title = String(body.title || '').trim();
    const responsibilities = String(body.responsibilities || '').trim();
    const kpiTargets = String(body.kpiTargets || '');
    const actionPoints = body.actionPoints ? String(body.actionPoints) : null;

    if (!title || !responsibilities) {
      return NextResponse.json(
        { success: false, error: 'Title and responsibilities are required' },
        { status: 400 }
      );
    }

    const allowed = await canAccessUser(auth, userId);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const count = await prisma.rRCategory.count({ where: { userId } });

    const created = await prisma.rRCategory.create({
      data: {
        userId,
        title,
        responsibilities,
        kpiTargets,
        actionPoints,
        sortOrder: count,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('RR_POST_ERROR', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = getAuthUser();

  if (!auth || auth.role === 'TEAM_MEMBER') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = String(body.id || '');

    if (!id) {
      return NextResponse.json({ success: false, error: 'R&R id required' }, { status: 400 });
    }

    const existing = await prisma.rRCategory.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'R&R not found' }, { status: 404 });
    }

    const allowed = await canAccessUser(auth, existing.userId);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.rRCategory.update({
      where: { id },
      data: {
        title: String(body.title || ''),
        responsibilities: String(body.responsibilities || ''),
        kpiTargets: String(body.kpiTargets || ''),
        actionPoints: body.actionPoints ? String(body.actionPoints) : null,
        sortOrder: Number(body.sortOrder || 0),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('RR_PUT_ERROR', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthUser();

  if (!auth || auth.role === 'TEAM_MEMBER') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';

  if (!id) {
    return NextResponse.json({ success: false, error: 'R&R id required' }, { status: 400 });
  }

  const existing = await prisma.rRCategory.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: 'R&R not found' }, { status: 404 });
  }

  const allowed = await canAccessUser(auth, existing.userId);
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.$transaction(async tx => {
    await tx.kPIProgress.deleteMany({ where: { categoryId: id } });
    await tx.rRCategory.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}