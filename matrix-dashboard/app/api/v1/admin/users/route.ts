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
  districtId: z.string().uuid().optional().nullable(),
});

function sanitizeUser<T extends { passwordHash?: string | null }>(user: T) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    include: {
      district: {
        select: { id: true, name: true, code: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json({
    success: true,
    data: users.map((u) => sanitizeUser(u)),
  });
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
        {
          success: false,
          error: parsed.error.errors[0]?.message || 'Validation failed',
          details: parsed.error.errors,
        },
        { status: 422 }
      );
    }

    const { name, email, password, role, districtId } = parsed.data;

    if (currentUser.role === 'ADMIN' && role === 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin cannot create Super Admin users',
        },
        { status: 403 }
      );
    }

    if (role === 'FIELD_USER' && !districtId) {
      return NextResponse.json(
        {
          success: false,
          error: 'District is required for Field User',
        },
        { status: 422 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email already exists',
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        districtId: role === 'FIELD_USER' ? (districtId || null) : null,
      },
      include: {
        district: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    await logAction({
      userId: currentUser.userId,
      action: 'CREATE_USER',
      resource: 'users',
      resourceId: newUser.id,
      newData: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        districtId: newUser.districtId,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '',
      userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json(
      {
        success: true,
        data: sanitizeUser(newUser),
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('Create user error:', e);
    return NextResponse.json(
      {
        success: false,
        error: 'Server error',
      },
      { status: 500 }
    );
  }
}