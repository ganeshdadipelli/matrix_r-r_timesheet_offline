// app/api/v1/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { logAction } from '@/lib/audit/logger';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const body = await req.json();
    const { name, role, districtId, isActive, password } = body;

    const updateData: Record<string, unknown> = {};
    if (name)       updateData.name = name;
    if (role)       updateData.role = role;
    if (districtId !== undefined) updateData.districtId = districtId;
    if (isActive !== undefined)  updateData.isActive = isActive;
    if (password)   updateData.passwordHash = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id: params.id }, data: updateData,
      include: { district: { select: { id: true, name: true } } },
    });

    await logAction({ userId, action: 'UPDATE_USER', resource: 'users', resourceId: params.id, newData: { name, role, isActive } });
    return NextResponse.json({ success: true, data: { ...user, passwordHash: undefined } });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')!;
  await prisma.user.update({ where: { id: params.id }, data: { isActive: false } });
  await logAction({ userId, action: 'DEACTIVATE_USER', resource: 'users', resourceId: params.id });
  return NextResponse.json({ success: true, message: 'User deactivated' });
}
