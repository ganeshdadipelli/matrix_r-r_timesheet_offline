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

    const date = new Date(dateStr);

    const entries = await (prisma as any).timesheetEntry.findMany({
      where: {
        userId: auth.userId,
        date: date,
      },
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = getAuthUser();
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { date, startTime, endTime, tasks } = body;

    const parsedDate = new Date(date);
    
    // Calculate total hours
    const startMins = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMins = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    let totalHours = (endMins - startMins) / 60;
    if (totalHours < 0) totalHours = 0;

    const entry = await (prisma as any).timesheetEntry.upsert({
      where: {
        userId_date: {
          userId: auth.userId,
          date: parsedDate,
        },
      },
      update: {
        startTime,
        endTime,
        totalHours,
        tasks,
      },
      create: {
        userId: auth.userId,
        date: parsedDate,
        startTime,
        endTime,
        totalHours,
        tasks,
      },
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
