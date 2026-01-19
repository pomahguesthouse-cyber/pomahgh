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
 * Format date to Indonesian format
 * 2026-01-19 -> 19 Januari 2026
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
 * Date references for chatbot/system prompt
 */
export function getDateReferences() {
  const today = getWibDate();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const lusa = new Date(today);
  lusa.setDate(today.getDate() + 2);

  // Nearest weekend (Saturday)
  const weekend = new Date(today);
  const day = weekend.getDay(); // 0 = Minggu
  const daysUntilSaturday = (6 - day + 7) % 7;
  weekend.setDate(today.getDate() + daysUntilSaturday);

  return {
    today: formatDateISO(today),
    yesterday: formatDateISO(yesterday),
    tomorrow: formatDateISO(tomorrow),
    lusa: formatDateISO(lusa),
    weekend: formatDateISO(weekend),
    today_human: formatDateIndonesian(formatDateISO(today)),
  };
}
