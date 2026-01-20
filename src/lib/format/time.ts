/**
 * Time & Timezone Utilities - WIB (Western Indonesia Time)
 */

const WIB_OFFSET = 7 * 60; // 7 hours in minutes

/**
 * Get current date in WIB timezone (time set to 00:00:00)
 */
export const getWIBToday = (): Date => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wibTime = new Date(utc + WIB_OFFSET * 60000);
  wibTime.setHours(0, 0, 0, 0);
  return wibTime;
};

/**
 * Get current datetime in WIB timezone
 */
export const getWIBNow = (): Date => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + WIB_OFFSET * 60000);
};

/**
 * Convert any date to WIB timezone
 */
export const toWIB = (date: Date | string): Date => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const utc = dateObj.getTime() + dateObj.getTimezoneOffset() * 60000;
  return new Date(utc + WIB_OFFSET * 60000);
};

/**
 * Format Date to yyyy-MM-dd string
 */
export const formatWIBDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Format waktu dengan suffix WIB
 * @example formatTime("14:00") // "14:00 WIB"
 */
export const formatTime = (time: string): string => {
  const timeStr = time.split(":").slice(0, 2).join(":");
  return `${timeStr} WIB`;
};

/**
 * Format waktu tanpa suffix
 * @example formatTimeShort("14:00:00") // "14:00"
 */
export const formatTimeShort = (time: string): string => {
  return time.split(":").slice(0, 2).join(":");
};

/**
 * Check if a date is today in WIB timezone
 */
export const isWIBToday = (date: Date | string): boolean => {
  const wibToday = getWIBToday();
  const compareDate =
    typeof date === "string" ? new Date(date) : new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return formatWIBDate(compareDate) === formatWIBDate(wibToday);
};

/**
 * Get WIB date string for tomorrow
 */
export const getWIBTomorrow = (): Date => {
  const tomorrow = getWIBToday();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

/**
 * Add days to a WIB date
 */
export const addWIBDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};












