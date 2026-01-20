/**
 * Format Utilities
 * Text formatting, string manipulation, currency, etc.
 */

/**
 * Format number as currency (IDR)
 */
export const formatCurrency = (amount: number, currency: string = "IDR"): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

/**
 * Format number with thousand separators
 */
export const formatNumber = (num: number, decimalPlaces: number = 0): string => {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(num);
};

/**
 * Capitalize first letter of string
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert string to title case
 */
export const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

/**
 * Truncate string with ellipsis
 */
export const truncate = (str: string, length: number = 50): string => {
  return str.length > length ? str.substring(0, length) + "..." : str;
};

/**
 * Convert camelCase to kebab-case
 */
export const camelToKebab = (str: string): string => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase();
};

/**
 * Convert snake_case to camelCase
 */
export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Slugify string (remove special chars, spaces to dash)
 */
export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Generate random string
 */
export const generateRandomString = (length: number = 8): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Parse query parameters from URL
 */
export const parseQueryParams = (search: string): Record<string, string> => {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

/**
 * Build query string from object
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

/**
 * Highlight text - wrap matched text with html tag
 */
export const highlightText = (text: string, query: string, className: string = "highlight"): string => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, `<span class="${className}">$1</span>`);
};

/**
 * Remove HTML tags from string
 */
export const stripHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};
