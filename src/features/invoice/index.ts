/**
 * Invoice Feature Module
 * Exports all invoice-related components and hooks
 */

// Components (named export)
export { InvoicePreviewDialog } from "@/components/InvoicePreviewDialog";

// Hooks
export { useInvoice } from "@/hooks/useInvoice";
export { useInvoiceTemplate } from "@/hooks/useInvoiceTemplate";

// Types
export type { InvoiceTemplate } from "@/types/admin.types";
