/**
 * Date Formatting Utilities - Indonesian Locale
 */

import { format, differenceInDays, isValid, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

/**
 * Parse date from various formats
 */
const parseDate = (date: Date | string): Date => {
  if (date instanceof Date) return date;
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : new Date(date);
};

/**
 * Format tanggal ke bahasa Indonesia
 * @example formatDate(new Date()) // "30 November 2024"
 */
export const formatDate = (
  date: Date | string,
  formatStr: string = "dd MMMM yyyy"
): string => {
  const dateObj = parseDate(date);
  return format(dateObj, formatStr, { locale: localeId });
};

/**
 * Format tanggal dengan waktu WIB
 * @example formatDateTime(new Date()) // "30 November 2024, 14:30 WIB"
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = parseDate(date);
  const dateStr = format(dateObj, "dd MMMM yyyy", { locale: localeId });
  const timeStr = format(dateObj, "HH:mm", { locale: localeId });
  return `${dateStr}, ${timeStr} WIB`;
};

/**
 * Format tanggal pendek
 * @example formatDateShort(new Date()) // "30/11/2024"
 */
export const formatDateShort = (date: Date | string): string => {
  const dateObj = parseDate(date);
  return format(dateObj, "dd/MM/yyyy", { locale: localeId });
};

/**
 * Format tanggal ISO untuk database
 * @example formatDateISO(new Date()) // "2024-11-30"
 */
export const formatDateISO = (date: Date | string): string => {
  const dateObj = parseDate(date);
  return format(dateObj, "yyyy-MM-dd");
};

/**
 * Format rentang tanggal
 * @example formatDateRange(start, end) // "28 - 30 November 2024"
 */
export const formatDateRange = (
  start: Date | string,
  end: Date | string
): string => {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  const startMonth = format(startDate, "MMMM", { locale: localeId });
  const endMonth = format(endDate, "MMMM", { locale: localeId });
  const startYear = format(startDate, "yyyy");
  const endYear = format(endDate, "yyyy");

  if (startMonth === endMonth && startYear === endYear) {
    return `${format(startDate, "dd")} - ${format(endDate, "dd MMMM yyyy", { locale: localeId })}`;
  }

  if (startYear === endYear) {
    return `${format(startDate, "dd MMMM", { locale: localeId })} - ${format(endDate, "dd MMMM yyyy", { locale: localeId })}`;
  }

  return `${format(startDate, "dd MMMM yyyy", { locale: localeId })} - ${format(endDate, "dd MMMM yyyy", { locale: localeId })}`;
};

/**
 * Calculate number of nights between two dates
 */
export const calculateNights = (
  checkIn: Date | string,
  checkOut: Date | string
): number => {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  return Math.max(0, differenceInDays(end, start));
};

/**
 * Format hari dalam bahasa Indonesia
 * @example formatDayName(new Date()) // "Sabtu"
 */
export const formatDayName = (date: Date | string): string => {
  const dateObj = parseDate(date);
  return format(dateObj, "EEEE", { locale: localeId });
};

/**
 * Format bulan dalam bahasa Indonesia
 * @example formatMonthName(new Date()) // "November"
 */
export const formatMonthName = (date: Date | string): string => {
  const dateObj = parseDate(date);
  return format(dateObj, "MMMM", { locale: localeId });
};












