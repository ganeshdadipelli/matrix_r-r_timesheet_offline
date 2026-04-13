// app/api/v1/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { logAction } from '@/lib/audit/logger';
import { requireRoles } from '@/lib/auth/guards';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const body = await req.json();
    const { name, role, districtIds, isActive, password } = body;

    const updateData: Record<string, unknown> = {};
    if (name)                    updateData.name = name;
    if (role)                    updateData.role = role;
    if (districtIds !== undefined) {
      const ids: string[] = Array.isArray(districtIds) ? districtIds : [];
      updateData.districtId      = ids.length > 0 ? ids[0] : null;
      updateData.districtIdsJson = JSON.stringify(ids);
    }
    if (isActive !== undefined)  updateData.isActive = isActive;
    if (password)                updateData.passwordHash = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: { district: { select: { id: true, name: true } } },
    });

    await logAction({ userId, action: 'UPDATE_USER', resource: 'users', resourceId: params.id, newData: { name, role, isActive } });

    let parsedIds: string[] = [];
    try { parsedIds = JSON.parse((user as any).districtIdsJson || '[]'); } catch {}
    if (!parsedIds.length && user.districtId) parsedIds = [user.districtId];

    return NextResponse.json({ success: true, data: { ...user, passwordHash: undefined, districtIds: parsedIds } });
  } catch (e) {
    console.error('Update user error:', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      if (auth.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ success: false, error: 'Only Super Admin can permanently delete users' }, { status: 403 });
      }
      await prisma.user.delete({ where: { id: params.id } });
      await logAction({ userId: auth.user.userId, action: 'DELETE_USER', resource: 'users', resourceId: params.id });
      return NextResponse.json({ success: true, message: 'User permanently deleted' });
    }

    await prisma.user.update({ where: { id: params.id }, data: { isActive: false } });
    await logAction({ userId: auth.user.userId, action: 'DEACTIVATE_USER', resource: 'users', resourceId: params.id });
    return NextResponse.json({ success: true, message: 'User deactivated' });
  } catch (e) {
    console.error('Delete user error:', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
