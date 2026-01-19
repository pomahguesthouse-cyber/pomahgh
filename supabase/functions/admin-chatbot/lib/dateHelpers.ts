// lib/dateHelpers.ts
// ================= DATE HELPERS (WIB SAFE) =================

/**
 * Get current Date object in WIB
 */
export function getWibDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}

/**
 * Format Date or date-string to YYYY-MM-DD
 */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * Get today date in WIB (YYYY-MM-DD)
 */
export function getTodayWIB(): string {
  return formatDateISO(getWibDate());
}

/**
 * Get current time in WIB (HH:mm)
 */
export function getCurrentTimeWIB(): string {
  const d = getWibDate();
  return d.toISOString().split("T")[1].slice(0, 5);
}

/**
 * Compare current time (WIB) with target time (HH:mm)
 */
export function isBeforeTime(targetTime: string): boolean {
  const now = getCurrentTimeWIB();
  return now < targetTime;
}

/**
 * Normalize date to WIB date-only (YYYY-MM-DD)
 */
export function normalizeDateWIB(date: string | Date): string {
  return formatDateISO(typeof date === "string" ? new Date(date) : date);
}

/**
 * Check if target date is inside stay period
 * check_out is EXCLUSIVE
 */
export function isDateInStay(checkIn: string, checkOut: string, targetDate: string): boolean {
  const inDate = normalizeDateWIB(checkIn);
  const outDate = normalizeDateWIB(checkOut);
  const target = normalizeDateWIB(targetDate);

  return inDate <= target && target < outDate;
}

/**
 * Indonesian human-readable date
 * contoh: 19 Januari 2026
 */
export function formatDateIndonesian(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;

  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Date references for chatbot/system prompt
 */
export function getDateReferences() {
  const today = getTodayWIB();
  const tomorrow = formatDateISO(new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000));
  const yesterday = formatDateISO(new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000));

  return {
    today,
    tomorrow,
    yesterday,
    today_indonesian: formatDateIndonesian(today),
  };
}
