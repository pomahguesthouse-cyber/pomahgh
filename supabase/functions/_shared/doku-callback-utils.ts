export type CallbackStatus = "paid" | "failed" | "expired" | "pending";

const SUCCESS_STATUSES = new Set(["SUCCESS", "PAID", "SETTLEMENT", "COMPLETED"]);
const FAILED_STATUSES = new Set(["FAILED", "FAIL", "CANCELLED", "CANCELED", "DENIED"]);
const EXPIRED_STATUSES = new Set(["EXPIRED", "TIMEOUT"]);

export function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function extractInvoiceNumber(payload: Record<string, any>): string | null {
  return (
    payload?.order?.invoice_number ||
    payload?.order?.invoiceNumber ||
    payload?.invoice_number ||
    payload?.invoiceNumber ||
    payload?.merchant_order_id ||
    null
  );
}

export function extractAmount(payload: Record<string, any>): number | null {
  const rawAmount = payload?.order?.amount ?? payload?.amount ?? payload?.transaction?.amount ?? null;
  if (rawAmount === null || rawAmount === undefined || rawAmount === "") return null;
  const parsed = Number(rawAmount);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapCallbackStatus(payload: Record<string, any>): CallbackStatus {
  const rawStatus =
    payload?.transaction?.status ||
    payload?.transaction?.transaction_status ||
    payload?.transaction_status ||
    payload?.status ||
    payload?.order?.status ||
    "PENDING";

  const normalized = String(rawStatus).trim().toUpperCase();

  if (SUCCESS_STATUSES.has(normalized)) return "paid";
  if (FAILED_STATUSES.has(normalized)) return "failed";
  if (EXPIRED_STATUSES.has(normalized)) return "expired";
  return "pending";
}

export function buildInvoiceCandidates(invoiceNumber: string): string[] {
  const withoutInvPrefix = invoiceNumber.replace(/^INV-/i, "");
  const withInvPrefix = invoiceNumber.toUpperCase().startsWith("INV-")
    ? invoiceNumber
    : `INV-${invoiceNumber}`;

  return Array.from(new Set([invoiceNumber, withoutInvPrefix, withInvPrefix]));
}

export function extractVaNumber(payload: Record<string, any>): string | null {
  return payload?.virtual_account_info?.virtual_account_number || payload?.va_number || null;
}
