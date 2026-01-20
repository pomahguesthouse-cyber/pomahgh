/**
 * Date Utilities
 * Common date manipulation and formatting functions
 */

/**
 * Format date to string using specified format
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 */
export const formatDate = (date: Date | string, format: "short" | "long" | "full" = "short"): string => {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    
    const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
      short: { year: "numeric", month: "2-digit", day: "2-digit" },
      long: { year: "numeric", month: "long", day: "numeric" },
      full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
    };
    
    return d.toLocaleDateString("id-ID", formatOptions[format]);
  } catch {
    return "";
  }
};

/**
 * Format date in Indonesian format (dd MMMM yyyy)
 */
export const formatDateID = (date: Date | string): string => {
  return formatDate(date, "long");
};

/**
 * Format time to HH:mm
 */
export const formatTime = (date: Date | string): string => {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
};

/**
 * Format date and time
 */
export const formatDateTime = (date: Date | string): string => {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return (
      d.toLocaleDateString("id-ID", { year: "numeric", month: "2-digit", day: "2-digit" }) +
      " " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
    );
  } catch {
    return "";
  }
};

/**
 * Check if date is valid
 */
export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Check if date is in the past
 */
export const isPastDate = (date: Date | string): boolean => {
  const d = typeof date === "string" ? new Date(date) : date;
  return isValidDate(d) && d < new Date();
};

/**
 * Check if date is in the future
 */
export const isFutureDate = (date: Date | string): boolean => {
  const d = typeof date === "string" ? new Date(date) : date;
  return isValidDate(d) && d > new Date();
};

/**
 * Get days between two dates
 */
export const getDaysBetween = (startDate: Date | string, endDate: Date | string): number => {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  
  if (!isValidDate(start) || !isValidDate(end)) return 0;
  
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
};

/**
 * Add days to a date
 */
export const addDaysToDate = (date: Date | string, days: number): Date => {
  const d = typeof date === "string" ? new Date(date) : date;
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Get date at start of day (00:00:00)
 */
export const getStartOfDay = (date: Date | string): Date => {
  const d = typeof date === "string" ? new Date(date) : date;
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get date at end of day (23:59:59)
 */
export const getEndOfDay = (date: Date | string): Date => {
  const d = typeof date === "string" ? new Date(date) : date;
  const result = new Date(d);
  result.setHours(23, 59, 59, 999);
  return result;
};
