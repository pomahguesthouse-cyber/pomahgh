// lib/dateHelpers.ts

/**
 * Normalize date to WIB date-only (YYYY-MM-DD)
 */
export function normalizeDateWIB(date: string | Date): string {
  const d = new Date(date);
  const wibTime = d.getTime() + 7 * 60 * 60 * 1000;
  return new Date(wibTime).toISOString().split("T")[0];
}

/**
 * Get today date in WIB (YYYY-MM-DD)
 */
export function getTodayWIB(): string {
  return normalizeDateWIB(new Date());
}

/**
 * Check if target date is between check-in and check-out
 * check_out is EXCLUSIVE
 */
export function isDateInStay(checkIn: string, checkOut: string, targetDate: string): boolean {
  const inDate = normalizeDateWIB(checkIn);
  const outDate = normalizeDateWIB(checkOut);
  const target = normalizeDateWIB(targetDate);

  return inDate <= target && target < outDate;
}
