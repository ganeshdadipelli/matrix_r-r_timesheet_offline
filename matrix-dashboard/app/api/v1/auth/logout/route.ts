// app/api/v1/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logAction } from '@/lib/audit/logger';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (userId) {
    await logAction({
      userId, action: 'LOGOUT',
      ipAddress: req.headers.get('x-forwarded-for') || '',
      userAgent: req.headers.get('user-agent') || '',
    });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.delete('matrix_token');
  return res;
}
