// lib/utils/editLock.ts

export const LOCK_HOURS = 12;

export function canEditEntry(
  createdAt: Date | string,
  isLocked: boolean,
  role: string
): boolean {
  // Super Admin can ALWAYS edit — but we still track the lock
  // to prevent field users from editing
  if (isLocked) {
    // Only Super Admin can override locked entries
    return role === 'SUPER_ADMIN';
  }
  
  const created   = new Date(createdAt);
  const hoursDiff = (Date.now() - created.getTime()) / 3_600_000;
  
  if (hoursDiff > LOCK_HOURS) {
    // Past 12 hours — only Super Admin can edit
    return role === 'SUPER_ADMIN';
  }
  
  // Within 12 hours — anyone with edit permission can edit
  return true;
}

export function getTimeRemaining(createdAt: Date | string): string {
  const created  = new Date(createdAt);
  const lockTime = new Date(created.getTime() + LOCK_HOURS * 3_600_000);
  const ms       = lockTime.getTime() - Date.now();
  if (ms <= 0) return 'Locked';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m remaining`;
}

export function isWithin12Hours(createdAt: Date | string): boolean {
  const created   = new Date(createdAt);
  const hoursDiff = (Date.now() - created.getTime()) / 3_600_000;
  return hoursDiff <= LOCK_HOURS;
}