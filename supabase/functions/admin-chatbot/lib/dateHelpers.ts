// lib/dateHelpers.ts
// ==================================================
// Semua helper tanggal WIB (Asia/Jakarta)
// Satu pintu. Satu kebenaran. No UTC drama.
// ==================================================

const WIB_TIMEZONE = "Asia/Jakarta";

/**
 * Convert Date ke Date object WIB
 */
export function toWibDate(date: Date = new Date()): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: WIB_TIMEZONE }));
}

/**
 * Ambil tanggal WIB dalam format YYYY-MM-DD
 * WAJIB dipakai untuk logic booking
 */
export function getWibDate(date: Date = new Date()): string {
  const wib = toWibDate(date);
  return wib.toISOString().slice(0, 10);
}

/**
 * Ambil DateTime WIB (Date object)
 */
export function getWibDateTime(): Date {
  return toWibDate(new Date());
}

/**
 * Cek apakah sebuah tanggal (YYYY-MM-DD) adalah hari ini (WIB)
 */
export function isWibToday(dateString: string): boolean {
  return dateString === getWibDate();
}

/**
 * Bandingkan dua tanggal (YYYY-MM-DD)
 * return:
 * -1 = a < b
 *  0 = sama
 *  1 = a > b
 */
export function compareDates(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Cek apakah tanggal target berada di dalam range
 * Range bersifat:
 * checkIn <= target < checkOut
 */
export function isDateInStayRange(target: string, checkIn: string, checkOut: string): boolean {
  return target >= checkIn && target < checkOut;
}

/**
 * Hitung jumlah malam menginap
 */
export function countNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Generate array tanggal (YYYY-MM-DD) antara dua tanggal
 * Digunakan untuk availability / calendar
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = new Date(startDate);

  const end = new Date(endDate);

  while (current < end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
