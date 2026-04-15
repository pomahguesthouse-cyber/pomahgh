/** Normalize phone number to standard 62xxx format */
export function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  }
  if (!normalized.startsWith('62')) {
    normalized = '62' + normalized;
  }
  return normalized;
}

/** Validate phone number format (digits only, 10-15 chars) */
export function isValidPhone(phone: string): boolean {
  return /^\d{10,15}$/.test(phone);
}
