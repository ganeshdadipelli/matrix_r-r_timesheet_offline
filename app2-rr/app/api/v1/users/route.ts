import { Prisma, UserRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { getAuthUser } from '@/lib/auth/serverAuth';

type RRInput = {
  title?: string;
  responsibilities?: string;
  kpiTargets?: string;
  actionPoints?: string | null;
};

const ALLOWED_CREATE: Record<string, UserRole[]> = {
  SUPER_ADMIN: [UserRole.SUPER_BOSS, UserRole.MANAGER, UserRole.TEAM_MEMBER, UserRole.FIELD_USER, UserRole.ADMIN],
  SUPER_BOSS: [UserRole.SUPER_BOSS, UserRole.MANAGER, UserRole.TEAM_MEMBER, UserRole.FIELD_USER, UserRole.ADMIN],
  MANAGER: [UserRole.TEAM_MEMBER],
};

function stripPassword<T extends { passwordHash: string }>(user: T) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

async function canManageUser(
  auth: NonNullable<ReturnType<typeof getAuthUser>>,
  targetUserId: string
) {
  if (auth.role === 'SUPER_ADMIN') return true;
  // FIELD_USER and ADMIN can be managed by any SUPER_BOSS
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, parentId: true, role: true },
  });
  if (!target) return false;
  if (target.role === 'FIELD_USER' || target.role === 'ADMIN') {
    return ['SUPER_BOSS', 'SUPER_ADMIN'].includes(auth.role);
  }
  if (!['SUPER_BOSS', 'MANAGER'].includes(auth.role)) return false;

  if (auth.role === 'MANAGER') {
    return target.role === UserRole.TEAM_MEMBER && target.parentId === auth.userId;
  }

  if (auth.role === 'SUPER_BOSS') {
    // DC Head can manage other DC Heads they created
    if (target.role === UserRole.SUPER_BOSS) {
      return target.parentId === auth.userId;
    }

    if (target.role === UserRole.MANAGER) {
      if (target.parentId === auth.userId) return true;
      // Also allow if manager is under a child DC Head
      const parent = target.parentId
        ? await prisma.user.findUnique({
            where: { id: target.parentId },
            select: { parentId: true },
          })
        : null;
      return parent?.parentId === auth.userId;
    }

    if (target.role === UserRole.TEAM_MEMBER) {
      if (target.parentId === auth.userId) return true;

      const parent = target.parentId
        ? await prisma.user.findUnique({
            where: { id: target.parentId },
            select: { parentId: true, role: true },
          })
        : null;

      if (parent?.parentId === auth.userId) return true;
      // If member is under a manager whose parent is a child DC Head
      if (parent?.role === UserRole.MANAGER && parent.parentId) {
        const grandparent = await prisma.user.findUnique({
          where: { id: parent.parentId },
          select: { parentId: true },
        });
        return grandparent?.parentId === auth.userId;
      }
      return false;
    }
  }

  return false;
}

async function resolveParentId(
  auth: NonNullable<ReturnType<typeof getAuthUser>>,
  role: UserRole,
  requestedParentId: string | null
) {
  const authUser = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true },
  });

  if (!authUser) {
    throw new Error('Your session is outdated. Please login again.');
  }

  if (auth.role === 'MANAGER') {
    return authUser.id;
  }

  if (auth.role === 'SUPER_BOSS') {
    if (role === UserRole.SUPER_BOSS) {
      return authUser.id;
    }

    if (role === UserRole.MANAGER) {
      if (!requestedParentId) return authUser.id;

      const validParent = await prisma.user.findFirst({
        where: {
          id: requestedParentId,
          role: { in: [UserRole.SUPER_BOSS] },
          OR: [{ id: authUser.id }, { parentId: authUser.id }],
          isActive: true,
        },
        select: { id: true },
      });

      if (!validParent) throw new Error('Invalid DC Head selection');
      return validParent.id;
    }

    if (role === UserRole.TEAM_MEMBER) {
      if (!requestedParentId) return authUser.id;

      const validParent = await prisma.user.findFirst({
        where: {
          id: requestedParentId,
          role: { in: [UserRole.SUPER_BOSS, UserRole.MANAGER] },
          isActive: true,
        },
        select: { id: true, parentId: true },
      });

      if (!validParent) {
        throw new Error('Selected reporting parent is invalid');
      }

      return validParent.id;
    }
  }

  return requestedParentId || null;
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser();

  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const where: Prisma.UserWhereInput = {};

  // Check if requesting field-type users specifically
  const roleValues = role ? role.split(',').filter(r => Object.values(UserRole).includes(r as UserRole)) : [];
  const isFieldQuery = roleValues.some(r => ['FIELD_USER', 'ADMIN'].includes(r));

  if (isFieldQuery) {
    // Field users have no parent chain — any SUPER_BOSS or SUPER_ADMIN can see all of them
    if (!['SUPER_ADMIN', 'SUPER_BOSS'].includes(auth.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    if (roleValues.length > 0) {
      where.role = { in: roleValues as UserRole[] };
    }
  } else {
    if (auth.role === 'SUPER_BOSS') {
      where.OR = [{ parentId: auth.userId }, { parent: { parentId: auth.userId } }];
    } else if (auth.role === 'MANAGER') {
      where.parentId = auth.userId;
    } else if (auth.role === 'SUPER_ADMIN') {
      // no filter — see all
    } else {
      where.id = auth.userId;
    }

    if (roleValues.length === 1) {
      where.role = roleValues[0] as UserRole;
    } else if (roleValues.length > 1) {
      where.role = { in: roleValues as UserRole[] };
    }
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      parent: { select: { id: true, name: true, role: true } },
      district: { select: { id: true, name: true, code: true } },
      rrCategories: {
        select: { id: true, title: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({
    success: true,
    data: users.map(stripPassword),
  });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser();

  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const name = String(body.name || '').trim();
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || 'DC@2026');
    const role = String(body.role || '') as UserRole;
    const designation = body.designation ? String(body.designation) : null;
    const domain = body.domain ? String(body.domain) : null;
    const photoUrl = body.photoUrl ? String(body.photoUrl) : null;
    const parentId = body.parentId ? String(body.parentId) : null;
    const districtId = body.districtId ? String(body.districtId) : null;
    const rrCategories = Array.isArray(body.rrCategories) ? (body.rrCategories as RRInput[]) : [];

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, error: 'Name, email and role are required' },
        { status: 400 }
      );
    }

    const allowed = ALLOWED_CREATE[auth.role] || [];
    if (!allowed.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Your role cannot create ${role}` },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const isFieldRole = role === 'FIELD_USER' || role === 'ADMIN';
    const resolvedParentId = isFieldRole ? null : await resolveParentId(auth, role, parentId);

    if (resolvedParentId) {
      const parentExists = await prisma.user.findUnique({
        where: { id: resolvedParentId },
        select: { id: true },
      });

      if (!parentExists) {
        return NextResponse.json(
          { success: false, error: 'Parent user not found. Please login again or reselect manager.' },
          { status: 400 }
        );
      }
    }

    // Validate district for field users
    if (role === UserRole.FIELD_USER && districtId) {
      const districtExists = await prisma.district.findUnique({ where: { id: districtId } });
      if (!districtExists) {
        return NextResponse.json({ success: false, error: 'Invalid district' }, { status: 400 });
      }
    }

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role,
          designation,
          domain,
          photoUrl,
          parentId: resolvedParentId,
          districtId: isFieldRole ? (districtId || null) : null,
        },
      });

      const validRRs = rrCategories.filter(
        item => String(item.title || '').trim() && String(item.responsibilities || '').trim()
      );

      if (validRRs.length > 0) {
        await tx.rRCategory.createMany({
          data: validRRs.map((item, index) => ({
            userId: user.id,
            title: String(item.title || '').trim(),
            responsibilities: String(item.responsibilities || '').trim(),
            kpiTargets: String(item.kpiTargets || ''),
            actionPoints: item.actionPoints ? String(item.actionPoints) : null,
            sortOrder: index,
          })),
        });
      }

      return user;
    });

    return NextResponse.json({ success: true, data: stripPassword(created) }, { status: 201 });
  } catch (error: any) {
    console.error('USER_POST_ERROR', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthUser();

  if (!auth || !['SUPER_ADMIN', 'SUPER_BOSS', 'MANAGER'].includes(auth.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = String(body.id || '');

    if (!id) {
      return NextResponse.json({ success: false, error: 'User id is required' }, { status: 400 });
    }

    const allowed = await canManageUser(auth, id);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: body.name ? String(body.name) : undefined,
        designation: typeof body.designation === 'string' ? body.designation : undefined,
        domain: typeof body.domain === 'string' ? body.domain : undefined,
        photoUrl: typeof body.photoUrl === 'string' ? body.photoUrl : undefined,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      },
    });

    return NextResponse.json({ success: true, data: stripPassword(updated) });
  } catch (error: any) {
    console.error('USER_PATCH_ERROR', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = getAuthUser();

  if (!auth || !['SUPER_ADMIN', 'SUPER_BOSS', 'MANAGER'].includes(auth.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';

  if (!id) {
    return NextResponse.json({ success: false, error: 'User id is required' }, { status: 400 });
  }

  const allowed = await canManageUser(auth, id);
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const childCount = await prisma.user.count({
    where: { parentId: id },
  });

  if (childCount > 0) {
    return NextResponse.json(
      { success: false, error: 'Delete team members first before deleting this user' },
      { status: 400 }
    );
  }

  await prisma.$transaction(async tx => {
    await tx.kPIProgress.deleteMany({ where: { userId: id } });
    await tx.rRCategory.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}