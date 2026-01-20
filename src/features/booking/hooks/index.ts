/**
 * Booking Hooks Barrel Export
 */
export { useBooking } from "./useBooking";
export type { BookingData } from "./useBooking";
export { useBookingValidation } from "./useBookingValidation";

// Re-export from shared hooks for backward compatibility
export { useBookingExport } from "@/hooks/useBookingExport";
