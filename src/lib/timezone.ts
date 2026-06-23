import { format as fnsFormat, formatDistanceToNow as fnsFormatDistanceToNow } from 'date-fns';

const SYSTEM_TZ = 'America/New_York';

export function toEST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const estString = d.toLocaleString('en-US', { timeZone: SYSTEM_TZ });
  return new Date(estString);
}

export function formatEST(date: Date | string, formatStr: string): string {
  return fnsFormat(toEST(date), formatStr);
}

export function formatDistanceEST(date: Date | string, options?: { addSuffix?: boolean }): string {
  return fnsFormatDistanceToNow(toEST(date), options);
}

export function nowEST(): Date {
  return toEST(new Date());
}

export function todayStartEST(): string {
  const now = toEST(new Date());
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export function todayEndEST(): string {
  const now = toEST(new Date());
  now.setHours(23, 59, 59, 999);
  return now.toISOString();
}

export function getESTTimezoneLabel(): string {
  const now = new Date();
  const isDST = now.toLocaleString('en-US', { timeZone: SYSTEM_TZ, timeZoneName: 'short' }).includes('EDT');
  return isDST ? 'EDT' : 'EST';
}

export { SYSTEM_TZ };
