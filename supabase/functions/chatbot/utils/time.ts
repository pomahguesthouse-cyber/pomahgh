import { INDONESIAN_DAYS, INDONESIAN_MONTHS } from '../lib/constants.ts';

export function getWIBTime(): Date {
  const now = new Date();
  const wibOffset = 7 * 60; // UTC+7 in minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (wibOffset * 60000));
}

export function formatDateIndonesian(d: Date): string {
  return `${INDONESIAN_DAYS[d.getDay()]}, ${d.getDate()} ${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

export function getNextDayOfWeek(fromDate: Date, dayIndex: number): Date {
  const result = new Date(fromDate);
  const currentDay = result.getDay();
  const daysUntil = (dayIndex - currentDay + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntil);
  return result;
}

export function getTimeGreeting(hour: number): string {
  return hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam';
}

export function getNextSaturday(fromDate: Date): Date {
  return getNextDayOfWeek(fromDate, 6);
}
