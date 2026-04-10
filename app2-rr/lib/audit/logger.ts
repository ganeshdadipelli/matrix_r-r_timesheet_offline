// lib/audit/logger.ts
import prisma from '@/lib/db/prisma';

export async function logAction(params: {
  userId:     string;
  action:     string;
  resource?:  string;
  resourceId?: string;
  oldData?:   object | null;
  newData?:   object | null;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId:     params.userId,
        action:     params.action,
        resource:   params.resource,
        resourceId: params.resourceId,
        oldData:    params.oldData   ?? undefined,
        newData:    params.newData   ?? undefined,
        ipAddress:  params.ipAddress,
        userAgent:  params.userAgent,
      },
    });
  } catch (e) {
    // Don't crash the main request if logging fails
    console.error('Audit log error:', e);
  }
}
