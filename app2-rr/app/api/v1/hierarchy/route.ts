import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/serverAuth';

function stripPassword<T extends { passwordHash: string }>(user: T) {
  const { passwordHash, ...safe } = user;
  return safe;
}

async function getFullTeam(userId: string): Promise<any> {
  const directReports = await prisma.user.findMany({
    where: { parentId: userId },
    include: {
      rrCategories: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });

  const processedReports = await Promise.all(directReports.map(async (u) => {
    const subTeam = await getFullTeam(u.id);
    return {
      ...stripPassword(u),
      functionalId: (u as any).functionalId || null,
      children: subTeam.all,
      // For frontend compatibility with current layout engine:
      managers: subTeam.managers,
      directMembers: subTeam.members,
      heads: subTeam.heads,
      items: subTeam.all
    };
  }));

  const managers = processedReports.filter(u => u.role === 'MANAGER' || u.role === 'TEAM_LEAD');
  const members = processedReports.filter(u => u.role === 'TEAM_MEMBER' || u.role === 'FIELD_USER' || u.role === 'ADMIN');
  const heads = processedReports.filter(u => u.role === 'SUPER_BOSS');

  return {
    all: processedReports,
    managers: [...managers, ...processedReports.flatMap(u => u.managers || [])],
    members: members, // Keep direct members for the table view
    heads: [...heads, ...processedReports.flatMap(u => u.heads || [])],
  };
}

export async function GET() {
  const auth = getAuthUser();

  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Handle Team Member / Manager self-view if needed
  // ... (keeping existing self-view for specialized needs) ...

  // Identification Layer: Everyone can see the structure, but details are gated in the map UI
  const isGlobalVision = ['SUPER_BOSS', 'SUPER_ADMIN'].includes(auth.role);

  // Identify all "Independent Roots" (DC Heads with no parent)
  const roots = await prisma.user.findMany({
    where: { 
      role: 'SUPER_BOSS',
      parentId: null
    },
    include: {
      rrCategories: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });

  // Fallback if no independent roots (shouldn't happen in healthy DB)
  const targetRoots = roots.length > 0 ? roots : [await prisma.user.findUnique({ where: { id: auth.userId }, include: { rrCategories: true } })].filter(Boolean) as any[];

  const fullHierarchy = await Promise.all(targetRoots.map(async (root) => {
    const team = await getFullTeam(root.id);
    return {
      owner: { ...stripPassword(root), functionalId: (root as any).functionalId || null },
      managers: team.managers,
      directMembers: team.members,
      heads: team.heads,
    };
  }));

  return NextResponse.json({
    success: true,
    data: {
      type: 'hierarchy',
      roots: fullHierarchy,
      ...(fullHierarchy.length > 0 ? fullHierarchy[0] : {}),
      globalCount: {
        heads: roots.length,
        totalUsers: await prisma.user.count()
      }
    },
  });
}