// WIB = Western Indonesia Time (UTC+7)
const WIB_OFFSET = 7 * 60; // 7 hours in minutes

/**
 * Get current date in WIB timezone (time set to 00:00:00)
 */
export const getWIBToday = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (WIB_OFFSET * 60000));
  wibTime.setHours(0, 0, 0, 0);
  return wibTime;
};

/**
 * Get current datetime in WIB timezone
 */
export const getWIBNow = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (WIB_OFFSET * 60000));
};

/**
 * Get WIB date string in yyyy-MM-dd format
 */
export const getWIBTodayString = (): string => {
  return getWIBToday().toISOString().split('T')[0];
};

/**
 * Check if a date is today in WIB timezone
 */
export const isWIBToday = (date: Date): boolean => {
  const wibToday = getWIBToday();
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate.toISOString().split('T')[0] === wibToday.toISOString().split('T')[0];
};

/**
 * Format date for database storage (yyyy-MM-dd)
 */
export const formatWIBDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get Indonesia date string (alias for consistency)
 */
export const getIndonesiaTodayString = getWIBTodayString;

/**
 * Get Indonesia today date (alias for consistency)
 */
export const getIndonesiaToday = getWIBToday;
