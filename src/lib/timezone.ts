import { format as fnsFormat, formatDistanceToNow as fnsFormatDistanceToNow } from 'date-fns';

// Simple date formatting without timezone conversion
// Appointments display exactly as entered - no timezone adjustments

export function formatDate(date: Date | string, formatStr: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return fnsFormat(d, formatStr);
}

export function formatDistance(date: Date | string, options?: { addSuffix?: boolean }): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return fnsFormatDistanceToNow(d, options);
}

export function now(): Date {
  return new Date();
}

export function todayStart(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export function todayEnd(): string {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

// Backward compatibility aliases (deprecated but kept for migration)
export const formatEST = formatDate;
export const formatDistanceEST = formatDistance;
export const toEST = (date: Date | string) => typeof date === 'string' ? new Date(date) : date;
export const nowEST = now;
export const todayStartEST = todayStart;
export const todayEndEST = todayEnd;
