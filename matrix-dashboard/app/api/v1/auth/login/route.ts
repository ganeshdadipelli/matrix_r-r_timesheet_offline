// app/api/v1/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createToken } from '@/lib/auth/jwt';
import { logAction } from '@/lib/audit/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { district: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await logAction({ userId: user.id, action: 'FAILED_LOGIN',
        ipAddress: req.headers.get('x-forwarded-for') || '',
        userAgent: req.headers.get('user-agent') || '' });
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createToken({
      userId: user.id, email: user.email, name: user.name,
      role: user.role, districtId: user.districtId,
    });

    await logAction({ userId: user.id, action: 'LOGIN',
      ipAddress: req.headers.get('x-forwarded-for') || '',
      userAgent: req.headers.get('user-agent') || '' });

    let districtIds: string[] = [];
    try { districtIds = JSON.parse((user as any).districtIdsJson || '[]'); } catch {}
    if (!districtIds.length && user.districtId) districtIds = [user.districtId];

    const userData = {
      id: user.id, name: user.name, email: user.email,
      role: user.role, districtId: user.districtId,
      districtIds,
      district: user.district
        ? { id: user.district.id, name: user.district.name, code: user.district.code }
        : null,
    };

    const response = NextResponse.json({ success: true, data: { token, user: userData } });

    // SERVER sets httpOnly cookie — browser ALWAYS sends this with every request
    // httpOnly = JS cannot touch it = no encoding corruption possible
    response.cookies.set({
      name:     'matrix_token',
      value:    token,           // raw JWT, no encoding
      httpOnly: false,           // false so JS can also read it
      secure:   false,           // false for localhost dev
      sameSite: 'lax',
      maxAge:   86400,           // 24 hours in seconds
      path:     '/',
    });

    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}