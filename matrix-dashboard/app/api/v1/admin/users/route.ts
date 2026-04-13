import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { logAction } from '@/lib/audit/logger';
import { requireRoles } from '@/lib/auth/guards';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['FIELD_USER', 'ADMIN', 'SUPER_ADMIN']),
  districtIds: z.array(z.string().uuid()).default([]),
});

function sanitizeUser<T extends { passwordHash?: string | null }>(user: T) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function parseDistrictIds(json: string): string[] {
  try { return JSON.parse(json); } catch { return []; }
}

export async function GET() {
  try {
    const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
    if (!auth.ok) return auth.response;

    const users = await prisma.user.findMany({
      include: {
        district: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: users.map((u) => {
        const districtIds = parseDistrictIds(u.districtIdsJson);
        // Backward compat: if no multi-district set, fall back to single districtId
        const effectiveIds = districtIds.length > 0 ? districtIds : (u.districtId ? [u.districtId] : []);
        return { ...sanitizeUser(u), districtIds: effectiveIds };
      }),
    });
  } catch (e) {
    console.error('GET /api/v1/admin/users error:', e);
    return NextResponse.json({ success: false, error: 'Failed to load users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
    if (!auth.ok) return auth.response;

    const currentUser = auth.user;
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Validation failed', details: parsed.error.errors },
        { status: 422 }
      );
    }

    const { name, email, password, role, districtIds } = parsed.data;

    if (currentUser.role === 'ADMIN' && role === 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin cannot create Super Admin users' }, { status: 403 });
    }

    if (role === 'FIELD_USER' && districtIds.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one district is required for Field User' }, { status: 422 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        districtId: role === 'FIELD_USER' && districtIds.length > 0 ? districtIds[0] : null,
        districtIdsJson: role === 'FIELD_USER' ? JSON.stringify(districtIds) : '[]',
      },
      include: { district: { select: { id: true, name: true, code: true } } },
    });

    await logAction({
      userId: currentUser.userId,
      action: 'CREATE_USER',
      resource: 'users',
      resourceId: newUser.id,
      newData: { name: newUser.name, email: newUser.email, role: newUser.role, districtIds },
      ipAddress: req.headers.get('x-forwarded-for') || '',
      userAgent: req.headers.get('user-agent') || '',
    });

    const effectiveIds = districtIds.length > 0 ? districtIds : [];
    return NextResponse.json({ success: true, data: { ...sanitizeUser(newUser), districtIds: effectiveIds } }, { status: 201 });
  } catch (e) {
    console.error('Create user error:', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
