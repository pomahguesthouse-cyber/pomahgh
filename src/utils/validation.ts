/**
 * Validation Utilities
 * Common validation functions for forms and data
 */

import { VALIDATION_RULES, FIELD_LENGTH } from "@/constants/validationRules";

export const validateEmail = (email: string): boolean => {
  return VALIDATION_RULES.EMAIL.test(email) && email.length <= FIELD_LENGTH.MAX_EMAIL;
};

export const validatePhone = (phone: string): boolean => {
  return VALIDATION_RULES.INDONESIAN_PHONE.test(phone);
};

export const validatePassword = (password: string): boolean => {
  return (
    password.length >= FIELD_LENGTH.MIN_PASSWORD &&
    password.length <= FIELD_LENGTH.MAX_PASSWORD &&
    VALIDATION_RULES.PASSWORD.test(password)
  );
};

export const validateUsername = (username: string): boolean => {
  return (
    VALIDATION_RULES.USERNAME.test(username) &&
    username.length >= 3 &&
    username.length <= 16
  );
};

export const validateURL = (url: string): boolean => {
  return VALIDATION_RULES.URL.test(url);
};

export const validatePostalCode = (code: string): boolean => {
  return VALIDATION_RULES.POSTAL_CODE.test(code);
};

export const validateName = (name: string): boolean => {
  return (
    name.length >= FIELD_LENGTH.MIN_NAME &&
    name.length <= FIELD_LENGTH.MAX_NAME
  );
};

export const validateAddress = (address: string): boolean => {
  return (
    address.length >= FIELD_LENGTH.MIN_ADDRESS &&
    address.length <= FIELD_LENGTH.MAX_ADDRESS
  );
};

export const validateDate = (date: Date | string): boolean => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d instanceof Date && !isNaN(d.getTime());
};

export const validateDateRange = (startDate: Date | string, endDate: Date | string): boolean => {
  if (!validateDate(startDate) || !validateDate(endDate)) {
    return false;
  }
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  return start < end;
};

export const validateFileSize = (file: File, maxSizeMB: number = 5): boolean => {
  return file.size <= maxSizeMB * 1024 * 1024;
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};
