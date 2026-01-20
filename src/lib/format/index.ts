/**
 * Format Utilities - Central Export
 */

// Currency
export {
  formatRupiah,
  formatNumber,
  parseRupiah,
  formatRupiahNoSymbol,
  formatRupiahShort,
} from "./currency";

// Date
export {
  formatDate,
  formatDateTime,
  formatDateShort,
  formatDateISO,
  formatDateRange,
  calculateNights,
  formatDayName,
  formatMonthName,
} from "./date";

// Time & WIB
export {
  getWIBToday,
  getWIBNow,
  toWIB,
  formatWIBDate,
  formatTime,
  formatTimeShort,
  isWIBToday,
  getWIBTomorrow,
  addWIBDays,
} from "./time";

// Re-export holidays from existing location
export {
  isIndonesianHoliday,
  getAllHolidays,
  type IndonesianHoliday,
} from "@/utils/indonesianHolidays";












