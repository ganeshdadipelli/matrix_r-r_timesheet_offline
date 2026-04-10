import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/serverAuth';

async function canAccessUser(auth: NonNullable<ReturnType<typeof getAuthUser>>, targetUserId: string) {
  if (auth.role === 'SUPER_ADMIN') return true;
  if (auth.userId === targetUserId) return true;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, parentId: true },
  });

  if (!target) return false;

  if (auth.role === 'MANAGER') {
    return target.parentId === auth.userId;
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

  const progress = await prisma.kPIProgress.findMany({
    where: { userId },
    include: {
      category: true,
    },
    orderBy: [{ week: 'desc' }, { updatedAt: 'desc' }],
  });

  return NextResponse.json({ success: true, data: progress });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser();

  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const categoryId = String(body.categoryId || '');
    const week = String(body.week || '');
    const achievement = String(body.achievement || '').trim();
    const notes = body.notes ? String(body.notes) : null;
    const score =
      body.score === null || body.score === '' || typeof body.score === 'undefined'
        ? null
        : Number(body.score);

    if (!categoryId || !week || !achievement) {
      return NextResponse.json(
        { success: false, error: 'categoryId, week and achievement are required' },
        { status: 400 }
      );
    }

    if (score !== null && (Number.isNaN(score) || score < 0 || score > 100)) {
      return NextResponse.json(
        { success: false, error: 'Score must be between 0 and 100' },
        { status: 400 }
      );
    }

    const category = await prisma.rRCategory.findUnique({
      where: { id: categoryId },
      select: { userId: true },
    });

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    if (category.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: 'You can update KPI only for your own categories' },
        { status: 403 }
      );
    }

    const saved = await prisma.kPIProgress.upsert({
      where: {
        userId_categoryId_week: {
          userId: auth.userId,
          categoryId,
          week,
        },
      },
      update: {
        achievement,
        score,
        notes,
      },
      create: {
        userId: auth.userId,
        categoryId,
        week,
        achievement,
        score,
        notes,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('KPI_POST_ERROR', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}