// ================= DATE HELPERS (WIB) =================

const WIB_TIMEZONE = "Asia/Jakarta";

/**
 * Get current Date object in WIB timezone
 */
export function getWibDate(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: WIB_TIMEZONE }));
}

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get current time in WIB as HH:mm
 */
export function getCurrentTimeWIB(): string {
  const now = getWibDate();
  return now.toTimeString().slice(0, 5);
}

/**
 * Compare current WIB time with given HH:mm
 * return true if now < compareTime
 */
export function isBeforeTime(compareTime: string): boolean {
  const now = getCurrentTimeWIB();
  return now < compareTime;
}
