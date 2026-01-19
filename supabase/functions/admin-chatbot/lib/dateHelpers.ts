// lib/dateHelpers.ts
// =======================================================
// DATE HELPERS (WIB SAFE, BACKWARD COMPATIBLE, STABLE)
// =======================================================

/* ================= BASIC WIB HELPERS ================= */

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
 * Compare current WIB time with target time (HH:mm)
 */
export function isBeforeTime(targetTime: string): boolean {
  const now = getCurrentTimeWIB();
  return now < targetTime;
}

/* ================= NORMALIZATION ================= */

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

/* ================= FORMATTING ================= */

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

/* ================= CHATBOT DATE REFERENCES ================= */

/**
 * Date references for chatbot & system prompt
 */
export function getDateReferences() {
  const today = getTodayWIB();
  const base = new Date(today);

  const yesterday = new Date(base);
  yesterday.setDate(base.getDate() - 1);

  const tomorrow = new Date(base);
  tomorrow.setDate(base.getDate() + 1);

  const lusa = new Date(base);
  lusa.setDate(base.getDate() + 2);

  // Cari Sabtu terdekat (weekend)
  const weekend = new Date(base);
  const day = weekend.getDay(); // 0=Sun, 6=Sat
  const daysToSaturday = (6 - day + 7) % 7 || 7;
  weekend.setDate(base.getDate() + daysToSaturday);

  return {
    today,
    yesterday: formatDateISO(yesterday),
    tomorrow: formatDateISO(tomorrow),
    lusa: formatDateISO(lusa),
    weekend: formatDateISO(weekend),
    today_indonesian: formatDateIndonesian(today),
  };
}
