import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/serverAuth';

function stripPassword<T extends { passwordHash: string }>(user: T) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export async function GET() {
  const auth = getAuthUser();

  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (auth.role === 'TEAM_MEMBER') {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        parent: { select: { id: true, name: true, role: true } },
        rrCategories: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        type: 'self',
        user: stripPassword(user),
      },
    });
  }

  if (auth.role === 'MANAGER') {
    const self = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        rrCategories: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!self) {
      return NextResponse.json({ success: false, error: 'Manager not found' }, { status: 404 });
    }

    const team = await prisma.user.findMany({
      where: { parentId: auth.userId, role: 'TEAM_MEMBER' },
      include: {
        rrCategories: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        type: 'manager',
        self: stripPassword(self),
        team: team.map(stripPassword),
      },
    });
  }

  if (!['SUPER_BOSS', 'SUPER_ADMIN'].includes(auth.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const owner = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: {
      rrCategories: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!owner) {
    return NextResponse.json({ success: false, error: 'DC Head not found' }, { status: 404 });
  }

  const directManagers = await prisma.user.findMany({
    where: {
      parentId: auth.userId,
      role: 'MANAGER',
    },
    include: {
      rrCategories: { orderBy: { sortOrder: 'asc' } },
      children: {
        where: { role: 'TEAM_MEMBER' },
        include: {
          rrCategories: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const directMembers = await prisma.user.findMany({
    where: {
      parentId: auth.userId,
      role: 'TEAM_MEMBER',
    },
    include: {
      rrCategories: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });

  const childHeadsRaw = await prisma.user.findMany({
    where: {
      parentId: auth.userId,
      role: 'SUPER_BOSS',
    },
    include: {
      rrCategories: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });

  const childHeads = await Promise.all(
    childHeadsRaw.map(async head => {
      const managers = await prisma.user.findMany({
        where: {
          parentId: head.id,
          role: 'MANAGER',
        },
        include: {
          rrCategories: { orderBy: { sortOrder: 'asc' } },
          children: {
            where: { role: 'TEAM_MEMBER' },
            include: {
              rrCategories: { orderBy: { sortOrder: 'asc' } },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      const directMembersUnderHead = await prisma.user.findMany({
        where: {
          parentId: head.id,
          role: 'TEAM_MEMBER',
        },
        include: {
          rrCategories: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { name: 'asc' },
      });

      return {
        ...stripPassword(head),
        managers: managers.map(manager => ({
          ...stripPassword(manager),
          children: manager.children.map(stripPassword),
        })),
        directMembers: directMembersUnderHead.map(stripPassword),
      };
    })
  );

  return NextResponse.json({
    success: true,
    data: {
      type: 'hierarchy',
      owner: stripPassword(owner),
      managers: directManagers.map(manager => ({
        ...stripPassword(manager),
        children: manager.children.map(stripPassword),
      })),
      directMembers: directMembers.map(stripPassword),
      heads: childHeads,
    },
  });
}