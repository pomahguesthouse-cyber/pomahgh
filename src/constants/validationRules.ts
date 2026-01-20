/**
 * Validation Rules - Centralized validation patterns and rules
 */

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+62|62|0)[0-9]{9,12}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,16}$/,
  POSTAL_CODE: /^[0-9]{5}$/,
  INDONESIAN_PHONE: /^(\+62|62|0)(2|8)[0-9]{7,11}$/,
} as const;

export const VALIDATION_MESSAGES = {
  EMAIL_INVALID: "Alamat email tidak valid.",
  PHONE_INVALID: "Nomor telepon tidak valid.",
  PASSWORD_WEAK: "Password harus mengandung huruf besar, huruf kecil, dan angka.",
  USERNAME_INVALID: "Username hanya boleh berisi huruf, angka, underscore, dan dash (3-16 karakter).",
  URL_INVALID: "URL tidak valid.",
} as const;

export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL: false,
} as const;

export const FIELD_LENGTH = {
  MIN_NAME: 2,
  MAX_NAME: 100,
  MIN_EMAIL: 5,
  MAX_EMAIL: 255,
  MIN_PASSWORD: 8,
  MAX_PASSWORD: 128,
  MIN_PHONE: 10,
  MAX_PHONE: 15,
  MIN_ADDRESS: 5,
  MAX_ADDRESS: 500,
} as const;
