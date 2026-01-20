import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

/**
 * Format tanggal ke bahasa Indonesia
 * @param date - Date object atau string tanggal
 * @param formatStr - Format string (default: "dd MMMM yyyy")
 * @returns String tanggal terformat Indonesia
 * @example formatDateID(new Date()) // "30 November 2024"
 */
export const formatDateID = (date: Date | string, formatStr: string = "dd MMMM yyyy"): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: localeId });
};

/**
 * Format tanggal dengan waktu WIB
 * @param date - Date object atau string tanggal
 * @returns String tanggal dengan waktu WIB
 * @example formatDateTimeID(new Date()) // "30 November 2024, 14:30 WIB"
 */
export const formatDateTimeID = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const dateStr = format(dateObj, "dd MMMM yyyy", { locale: localeId });
  const timeStr = format(dateObj, "HH:mm", { locale: localeId });
  return `${dateStr}, ${timeStr} WIB`;
};

/**
 * Format tanggal pendek Indonesia
 * @param date - Date object atau string tanggal
 * @returns String tanggal format pendek
 * @example formatDateShortID(new Date()) // "30/11/2024"
 */
export const formatDateShortID = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "dd/MM/yyyy", { locale: localeId });
};

/**
 * Format angka ke format Indonesia (titik sebagai pemisah ribuan)
 * @param num - Angka yang akan diformat
 * @returns String angka terformat
 * @example formatNumberID(1760000) // "1.760.000"
 */
export const formatNumberID = (num: number): string => {
  return num.toLocaleString("id-ID");
};

/**
 * Format mata uang Rupiah
 * @param amount - Jumlah uang
 * @returns String Rupiah terformat
 * @example formatRupiahID(1760000) // "Rp 1.760.000"
 */
export const formatRupiahID = (amount: number): string => {
  return `Rp ${amount.toLocaleString("id-ID")}`;
};

/**
 * Format waktu dengan suffix WIB
 * @param time - String waktu format HH:mm atau HH:mm:ss
 * @returns String waktu dengan WIB
 * @example formatTimeID("14:00") // "14:00 WIB"
 */
export const formatTimeID = (time: string): string => {
  // Remove seconds if present
  const timeStr = time.split(":").slice(0, 2).join(":");
  return `${timeStr} WIB`;
};

/**
 * Format rentang tanggal Indonesia
 * @param start - Tanggal mulai
 * @param end - Tanggal akhir
 * @returns String rentang tanggal
 * @example formatDateRangeID(new Date(2024,10,28), new Date(2024,10,30)) // "28 - 30 November 2024"
 */
export const formatDateRangeID = (start: Date | string, end: Date | string): string => {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;
  
  const startMonth = format(startDate, "MMMM", { locale: localeId });
  const endMonth = format(endDate, "MMMM", { locale: localeId });
  const startYear = format(startDate, "yyyy");
  const endYear = format(endDate, "yyyy");
  
  // Same month and year
  if (startMonth === endMonth && startYear === endYear) {
    return `${format(startDate, "dd", { locale: localeId })} - ${format(endDate, "dd MMMM yyyy", { locale: localeId })}`;
  }
  
  // Same year, different month
  if (startYear === endYear) {
    return `${format(startDate, "dd MMMM", { locale: localeId })} - ${format(endDate, "dd MMMM yyyy", { locale: localeId })}`;
  }
  
  // Different year
  return `${format(startDate, "dd MMMM yyyy", { locale: localeId })} - ${format(endDate, "dd MMMM yyyy", { locale: localeId })}`;
};












