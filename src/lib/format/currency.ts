/**
 * Currency Formatting Utilities - Indonesian Rupiah
 */

/**
 * Format number ke Rupiah
 * @example formatRupiah(1760000) // "Rp 1.760.000"
 */
export const formatRupiah = (amount: number): string => {
  return `Rp ${amount.toLocaleString("id-ID")}`;
};

/**
 * Format number dengan pemisah ribuan Indonesia
 * @example formatNumber(1760000) // "1.760.000"
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString("id-ID");
};

/**
 * Parse Rupiah string ke number
 * @example parseRupiah("Rp 1.760.000") // 1760000
 */
export const parseRupiah = (rupiah: string): number => {
  return parseInt(rupiah.replace(/[^\d]/g, ""), 10) || 0;
};

/**
 * Format number ke Rupiah tanpa simbol
 * @example formatRupiahNoSymbol(1760000) // "1.760.000"
 */
export const formatRupiahNoSymbol = (amount: number): string => {
  return amount.toLocaleString("id-ID");
};

/**
 * Format number ke Rupiah dengan suffix K/M/B
 * @example formatRupiahShort(1760000) // "Rp 1,76 Jt"
 */
export const formatRupiahShort = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1).replace(".", ",")} Jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} Rb`;
  }
  return formatRupiah(amount);
};












