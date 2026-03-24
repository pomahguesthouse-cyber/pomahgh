import { INDONESIAN_MONTHS, INDONESIAN_DAYS } from './constants.ts';
import { DateValidationResult } from './types.ts';

/**
 * Format date in Indonesian (e.g., "15 Januari 2025")
 */
export function formatDateIndonesian(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = INDONESIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date with day name (e.g., "Rabu, 15 Januari 2025")
 */
export function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr);
  const dayName = INDONESIAN_DAYS[date.getDay()];
  const day = date.getDate();
  const month = INDONESIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
}

/**
 * Calculate number of nights between two dates
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Validate and fix dates - ensures dates are in the future
 * IMPROVEMENT: Returns warning flag instead of silent fix
 */
export function validateAndFixDate(dateStr: string, fieldName: string): DateValidationResult {
  const date = new Date(dateStr);
  
  // Use WIB (UTC+7) for accurate comparison
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + wibOffset);
  
  // Strip time for accurate date comparison
  const today = new Date(wibNow.getFullYear(), wibNow.getMonth(), wibNow.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  console.log(`📅 validateAndFixDate: ${fieldName}=${dateStr}, today(WIB)=${today.toISOString().split('T')[0]}, target=${targetDate.toISOString().split('T')[0]}`);
  
  // CRITICAL: If date is in the PAST, add 1 year
  if (targetDate < today) {
    const newYear = date.getFullYear() + 1;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const fixedDate = `${newYear}-${month}-${day}`;
    
    console.warn(`⚠️ ${fieldName}: Date ${dateStr} is in the past (WIB), correcting to ${fixedDate}`);
    
    return {
      date: fixedDate,
      wasFixed: true,
      warning: `Tanggal ${fieldName} dikoreksi ke tahun ${newYear} karena sudah lewat`
    };
  }
  
  // Date is already in the future
  return { date: dateStr, wasFixed: false };
}
