import { BookingCodeParseResult } from './types.ts';

/**
 * Sanitize booking ID input - remove special characters
 */
export function sanitizeBookingId(bookingId: string): string {
  return bookingId
    .trim()
    .replace(/,/g, '')      // Remove commas
    .replace(/\s+/g, '')    // Remove all whitespace
    .replace(/[^\w-]/g, ''); // Keep only alphanumeric, underscore, dash
}

/**
 * Validate booking code format (PMH-XXXXXX)
 */
export function validateBookingCodeFormat(code: string): boolean {
  return /^PMH-[A-Z0-9]{6}$/i.test(code);
}

/**
 * Parse and validate booking code - combined sanitize + validate
 * IMPROVEMENT: Structured return with clear error messages
 */
export function parseBookingCode(rawInput: string): BookingCodeParseResult {
  if (!rawInput || !rawInput.trim()) {
    return { 
      valid: false, 
      normalized: null, 
      error: "Kode booking tidak valid. Mohon berikan kode booking yang benar." 
    };
  }

  const sanitized = sanitizeBookingId(rawInput);
  
  if (!sanitized) {
    return { 
      valid: false, 
      normalized: null, 
      error: "Kode booking tidak valid. Mohon berikan kode booking yang benar." 
    };
  }
  
  if (!validateBookingCodeFormat(sanitized)) {
    return { 
      valid: false, 
      normalized: null, 
      error: `Format kode booking tidak valid. Kode booking seharusnya format PMH-XXXXXX (contoh: PMH-Y739M3). Yang Anda berikan: "${rawInput}"`
    };
  }
  
  return { 
    valid: true, 
    normalized: sanitized.toUpperCase() 
  };
}

/**
 * Normalize phone number - keep digits only
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Compare two phone numbers (checks if one contains the other)
 */
export function comparePhones(phone1: string, phone2: string): boolean {
  const n1 = normalizePhone(phone1);
  const n2 = normalizePhone(phone2);
  return n1.includes(n2) || n2.includes(n1);
}

/**
 * Validate required fields for booking verification
 */
export function validateBookingVerification(
  bookingId: string | undefined,
  guestPhone: string | undefined,
  guestEmail: string | undefined
): { valid: boolean; error?: string } {
  if (!bookingId || !guestPhone || !guestEmail) {
    return {
      valid: false,
      error: "Kode booking, nomor telepon, dan email wajib diisi untuk verifikasi"
    };
  }
  return { valid: true };
}

/**
 * Format price in Indonesian Rupiah
 */
export function formatPrice(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}
