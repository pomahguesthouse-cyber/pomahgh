// ============= DATE HELPERS (WIB TIMEZONE) =============

import { INDONESIAN_DAYS, INDONESIAN_MONTHS } from "./constants.ts";
import type { DateReferences } from "./types.ts";

/**
 * Get current WIB (Western Indonesia Time) date
 */
export function getWibDate(): Date {
  const now = new Date();
  const wibOffset = 7 * 60; // UTC+7
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (wibOffset * 60000));
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format date in Indonesian format
 */
export function formatDateIndonesian(dateStr: string): string {
  const date = new Date(dateStr);
  const day = INDONESIAN_DAYS[date.getDay()];
  const month = INDONESIAN_MONTHS[date.getMonth()];
  return `${day}, ${date.getDate()} ${month} ${date.getFullYear()}`;
}

/**
 * Get date references for system prompt
 */
export function getDateReferences(): DateReferences {
  const wibTime = getWibDate();
  
  const today = formatDateISO(wibTime);
  const tomorrow = formatDateISO(addDays(wibTime, 1));
  const lusa = formatDateISO(addDays(wibTime, 2));
  const nextWeek = formatDateISO(addDays(wibTime, 7));
  
  // Calculate next weekend (Saturday)
  const currentDay = wibTime.getDay();
  const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
  const weekend = formatDateISO(addDays(wibTime, daysUntilSaturday));

  return { today, tomorrow, lusa, nextWeek, weekend };
}

/**
 * Get current WIB time string (HH:MM)
 */
export function getCurrentTimeWIB(): string {
  const wibDate = getWibDate();
  const hour = wibDate.getUTCHours();
  const minute = wibDate.getUTCMinutes();
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Check if current time is before a given time
 */
export function isBeforeTime(targetTime: string): boolean {
  const wibDate = getWibDate();
  const currentHour = wibDate.getUTCHours();
  const currentMinute = wibDate.getUTCMinutes();
  
  const [targetHour, targetMinute] = targetTime.split(':').map(Number);
  
  return currentHour < targetHour || (currentHour === targetHour && currentMinute < targetMinute);
}
