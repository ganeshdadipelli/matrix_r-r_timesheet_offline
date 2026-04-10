import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/serverAuth';

export async function GET(request: Request) {
  try {
    const auth = getAuthUser();
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    if (!dateStr) return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });

    const requestedDate = new Date(dateStr);

    // If SUPER admin or SUPER BOSS, we get all managers and team members underneath
    if (auth.role === 'SUPER_ADMIN' || auth.role === 'SUPER_BOSS') {
      const allUsers = await prisma.user.findMany({
        where: {
          OR: [
            { id: auth.userId },
            { parentId: auth.userId },
            { parent: { parentId: auth.userId } } // team members under managers who are under super boss
          ]
        },
        include: {
          timesheets: {
            where: { date: requestedDate }
          }
        },
        orderBy: { role: 'asc' }
      });
      return NextResponse.json({ success: true, data: allUsers });
    }

    // If MANAGER, we get self + direct team members
    if (auth.role === 'MANAGER') {
      const allUsers = await prisma.user.findMany({
        where: {
          OR: [
            { id: auth.userId },
            { parentId: auth.userId }
          ]
        },
        include: {
          timesheets: {
            where: { date: requestedDate }
          }
        },
        orderBy: { role: 'asc' }
      });
      return NextResponse.json({ success: true, data: allUsers });
    }

    return NextResponse.json({ success: false, error: 'Unauthorized role' }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
