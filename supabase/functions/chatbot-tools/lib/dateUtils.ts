import { INDONESIAN_MONTHS, INDONESIAN_DAYS } from './constants.ts';
import { DateValidationResult } from './types.ts';

/**
 * Format date ke format Indonesia yang mudah dibaca: "23 April 2026"
 */
export function formatDateIndonesian(dateStr: string): string {
  const date = new Date(dateStr);
  const d = date.getDate();
  const monthName = INDONESIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${d} ${monthName} ${year}`;
}

/**
 * Format date with day name (e.g., "Rabu, 15/01/2025")
 */
export function formatDateWithDay(dateStr: string): string {
  const date = new Date(dateStr);
  const dayName = INDONESIAN_DAYS[date.getDay()];
  return `${dayName}, ${formatDateIndonesian(dateStr)}`;
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
  
  // CRITICAL: If date is in the PAST, try next month first, then next year
  if (targetDate < today) {
    // Try adding 1 month first
    const nextMonthDate = new Date(date);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthTarget = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextMonthDate.getDate());
    
    let fixedDate: string;
    let fixedLabel: string;
    
    if (nextMonthTarget >= today) {
      // Next month works - use it (same year or year rolls over naturally)
      const year = nextMonthDate.getFullYear();
      const month = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
      const day = String(nextMonthDate.getDate()).padStart(2, '0');
      fixedDate = `${year}-${month}-${day}`;
      fixedLabel = `bulan depan (${fixedDate})`;
      console.warn(`⚠️ ${fieldName}: Date ${dateStr} is in the past (WIB), correcting to next month: ${fixedDate}`);
    } else {
      // Next month still in the past, add 1 year
      const newYear = date.getFullYear() + 1;
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      fixedDate = `${newYear}-${month}-${day}`;
      fixedLabel = `tahun ${newYear}`;
      console.warn(`⚠️ ${fieldName}: Date ${dateStr} is in the past (WIB), correcting to next year: ${fixedDate}`);
    }
    
    return {
      date: fixedDate,
      wasFixed: true,
      warning: `Tanggal ${fieldName} dikoreksi ke ${fixedLabel} karena sudah lewat`
    };
  }
  
  // Date is already in the future
  return { date: dateStr, wasFixed: false };
}
