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
  SUPER_ADMIN: [UserRole.SUPER_BOSS, UserRole.MANAGER, UserRole.TEAM_LEAD, UserRole.TEAM_MEMBER, UserRole.FIELD_USER, UserRole.ADMIN],
  SUPER_BOSS: [UserRole.SUPER_BOSS, UserRole.MANAGER, UserRole.TEAM_LEAD, UserRole.TEAM_MEMBER, UserRole.FIELD_USER, UserRole.ADMIN],
  MANAGER: [UserRole.TEAM_LEAD, UserRole.TEAM_MEMBER],
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
  
  if (auth.role === 'SUPER_BOSS') return true; // DC Heads have global management rights

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, parentId: true, role: true },
  });
  if (!target) return false;

  if (auth.role === 'MANAGER') {
    // Managers can manage their own team (Team Leads and Team Members)
    return (target.role === UserRole.TEAM_LEAD || target.role === UserRole.TEAM_MEMBER) && target.parentId === auth.userId;
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

  if (auth.role === 'SUPER_ADMIN' || auth.role === 'SUPER_BOSS') {
    return requestedParentId;
  }

  if (auth.role === 'MANAGER') {
    return authUser.id;
  }

  return requestedParentId || null;
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser();

  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
      if (auth.role === 'SUPER_BOSS' || auth.role === 'SUPER_ADMIN') {
        // no filter — see all for mapping transparency
      } else if (auth.role === 'MANAGER') {
        where.parentId = auth.userId;
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
        // functional: { select: { id: true, name: true, role: true } }, // Temporarily disabled for client sync
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
  } catch (err: any) {
    console.error('USERS_GET_CRASH', err);
    return NextResponse.json({ success: false, error: `Database sync required: ${err.message}` }, { status: 500 });
  }
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
    const functionalId = body.functionalId ? String(body.functionalId) : null;
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
          // role, // Move to raw SQL below to avoid enum validation issues
          designation,
          domain,
          photoUrl,
          parent: resolvedParentId ? { connect: { id: resolvedParentId } } : undefined,
          districtId: isFieldRole ? (districtId || null) : null,
        },
      });

      // Unified robust update for schema fields
      await tx.$executeRaw`UPDATE users SET role = ${role}::"UserRole" WHERE id = ${user.id}`;
      
      if (functionalId) {
        // Manual functional_id update to bypass Prisma check
        await tx.$executeRaw`UPDATE users SET functional_id = ${functionalId} WHERE id = ${user.id}`;
      }

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

    const updateData: any = {
      name: body.name ? String(body.name) : undefined,
      email: body.email ? String(body.email).toLowerCase().trim() : undefined,
      designation: typeof body.designation === 'string' ? body.designation : undefined,
      domain: typeof body.domain === 'string' ? body.domain : undefined,
      photoUrl: typeof body.photoUrl === 'string' ? body.photoUrl : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    };

    // Handle password update if provided
    if (body.password) {
      updateData.passwordHash = await hashPassword(String(body.password));
    }

    // Check email uniqueness if being updated
    if (updateData.email) {
      const existing = await prisma.user.findFirst({
        where: { email: updateData.email, NOT: { id } }
      });
      if (existing) {
        return NextResponse.json({ success: false, error: 'Email already exists for another user' }, { status: 409 });
      }
    }

    // 1. Standard update for known fields
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // 2. High-Robustness Update: Use Raw SQL for hierarchy to bypass stuck Prisma Client DLLs
    // This is the permanent fix for the "Unknown argument" error on Windows.
    if (body.parentId !== undefined) {
       const pId = body.parentId || null;
       await prisma.$executeRaw`UPDATE users SET parent_id = ${pId} WHERE id = ${id}`;
    }
    if (body.functionalId !== undefined) {
        const fId = body.functionalId || null;
        await prisma.$executeRaw`UPDATE users SET functional_id = ${fId} WHERE id = ${id}`;
     }
     if (body.role !== undefined) {
        await prisma.$executeRaw`UPDATE users SET role = ${body.role}::"UserRole" WHERE id = ${id}`;
     }
 
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

  try {
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
      // Clean up all related data to avoid FK constraints
      await tx.kPIProgress.deleteMany({ where: { userId: id } });
      await tx.rRCategory.deleteMany({ where: { userId: id } });
      await tx.timesheetEntry.deleteMany({ where: { userId: id } });
      await tx.auditLog.deleteMany({ where: { userId: id } });
      await tx.dailyEntry.deleteMany({ where: { createdById: id } });
      
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('USER_DELETE_ERROR', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}