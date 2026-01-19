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
 */
export function isBeforeTime(compareTime: string): boolean {
  const now = getCurrentTimeWIB();
  return now < compareTime;
}

/**
 * Format date to Indonesian human-readable format
 * Example: 2026-01-19 -> 19 Januari 2026
 */
export function formatDateIndonesian(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: WIB_TIMEZONE,
  });
}

/**
 * Common date references for systemPrompt
 */
export function getDateReferences() {
  const today = getWibDate();
  const todayISO = formatDateISO(today);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return {
    today: todayISO,
    yesterday: formatDateISO(yesterday),
    tomorrow: formatDateISO(tomorrow),
    today_human: formatDateIndonesian(todayISO),
  };
}
