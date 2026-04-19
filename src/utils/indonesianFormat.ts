import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

/**
 * Format tanggal default global: dd/MM/yyyy.
 * @param date - Date object atau string tanggal
 * @param formatStr - Format string (default: "dd/MM/yyyy")
 * @returns String tanggal terformat
 * @example formatDateID(new Date()) // "30/11/2024"
 */
export const formatDateID = (date: Date | string, formatStr: string = "dd/MM/yyyy"): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: localeId });
};

/**
 * Format tanggal + jam WIB dengan format global dd/MM/yyyy.
 * @example formatDateTimeID(new Date()) // "30/11/2024, 14:30 WIB"
 */
export const formatDateTimeID = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const dateStr = format(dateObj, "dd/MM/yyyy", { locale: localeId });
  const timeStr = format(dateObj, "HH:mm", { locale: localeId });
  return `${dateStr}, ${timeStr} WIB`;
};

/**
 * Alias historis — sama dengan formatDateID (dd/MM/yyyy).
 * Dipertahankan untuk kompatibilitas pemanggil lama.
 */
export const formatDateShortID = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "dd/MM/yyyy", { locale: localeId });
};

/**
 * Format angka ke format Indonesia (titik sebagai pemisah ribuan)
 * @example formatNumberID(1760000) // "1.760.000"
 */
export const formatNumberID = (num: number | null | undefined): string => {
  if (num == null) return "0";
  return num.toLocaleString("id-ID");
};

/**
 * Format mata uang Rupiah
 * @example formatRupiahID(1760000) // "Rp 1.760.000"
 */
export const formatRupiahID = (amount: number | null | undefined): string => {
  if (amount == null) return "Rp 0";
  return `Rp ${amount.toLocaleString("id-ID")}`;
};

/**
 * Format waktu dengan suffix WIB
 * @example formatTimeID("14:00") // "14:00 WIB"
 */
export const formatTimeID = (time: string): string => {
  const timeStr = time.split(":").slice(0, 2).join(":");
  return `${timeStr} WIB`;
};

/**
 * Format rentang tanggal — global dd/MM/yyyy.
 * @example formatDateRangeID("2024-11-28","2024-11-30") // "28/11/2024 - 30/11/2024"
 */
export const formatDateRangeID = (start: Date | string, end: Date | string): string => {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;
  return `${format(startDate, "dd/MM/yyyy", { locale: localeId })} - ${format(endDate, "dd/MM/yyyy", { locale: localeId })}`;
};
