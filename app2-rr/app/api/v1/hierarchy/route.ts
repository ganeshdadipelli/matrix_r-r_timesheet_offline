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

  // 1. Identify all "Root Holders" (DC Heads with no parent, or all DC Heads for Global View)
  const roots = await prisma.user.findMany({
    where: { 
      role: 'SUPER_BOSS',
      parentId: null // Independent Roots
    },
    include: {
      rrCategories: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });

  // If no independent roots found, use the current user as root fallback
  const targetRoots = roots.length > 0 ? roots : [await prisma.user.findUnique({ where: { id: auth.userId }, include: { rrCategories: true } })].filter(Boolean) as any[];

  const fullHierarchy = await Promise.all(targetRoots.map(async (root) => {
    // Fetch direct managers for this root
    const managers = await prisma.user.findMany({
      where: { parentId: root.id, role: 'MANAGER' },
      include: {
        rrCategories: { orderBy: { sortOrder: 'asc' } },
        children: {
          where: { role: 'TEAM_MEMBER' },
          include: { rrCategories: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Fetch direct members for this root
    const members = await prisma.user.findMany({
      where: { parentId: root.id, role: 'TEAM_MEMBER' },
      include: { rrCategories: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });

    // Fetch sub-heads for this root
    const subHeads = await prisma.user.findMany({
      where: { parentId: root.id, role: 'SUPER_BOSS' },
      include: { rrCategories: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });

    // Recursively handle sub-heads? (For now we just map them 1 level deep as per existing UI)
    const headsWithTeams = await Promise.all(subHeads.map(async (sh) => {
      const shManagers = await prisma.user.findMany({
        where: { parentId: sh.id, role: 'MANAGER' },
        include: {
          rrCategories: { orderBy: { sortOrder: 'asc' } },
          children: {
            where: { role: 'TEAM_MEMBER' },
            include: { rrCategories: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { name: 'asc' },
          },
        },
      });
      const shMembers = await prisma.user.findMany({
        where: { parentId: sh.id, role: 'TEAM_MEMBER' },
        include: { rrCategories: { orderBy: { sortOrder: 'asc' } } },
      });

      return {
        ...stripPassword(sh),
        managers: shManagers.map(m => ({ ...stripPassword(m), children: m.children.map(stripPassword) })),
        directMembers: shMembers.map(stripPassword),
      };
    }));

    return {
      owner: stripPassword(root),
      managers: managers.map(m => ({ ...stripPassword(m), children: m.children.map(stripPassword) })),
      directMembers: members.map(stripPassword),
      heads: headsWithTeams,
    };
  }));

  // Return as a plural hierarchy list if multiple roots exist
  return NextResponse.json({
    success: true,
    data: {
      type: 'hierarchy',
      roots: fullHierarchy,
      // Fallback for legacy frontend code expecting single owner
      ...(fullHierarchy.length > 0 ? fullHierarchy[0] : {}),
      globalCount: {
        heads: roots.length,
        totalUsers: await prisma.user.count()
      }
    },
  });
}