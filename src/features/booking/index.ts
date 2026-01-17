/**
 * Booking Feature Module
 * Exports all booking-related components and hooks
 */

// Components (named exports)
export { BookingDialog } from "@/components/BookingDialog";
export { BookingConfirmationDialog } from "@/components/BookingConfirmationDialog";
export { RefundPolicyDisplay } from "@/components/RefundPolicyDisplay";
export { AddonSelector } from "@/components/booking/AddonSelector";

// Hooks
export { useBooking } from "@/hooks/useBooking";
export type { BookingData } from "@/hooks/useBooking";
export { useBookingValidation } from "@/hooks/useBookingValidation";
export { useBookingExport } from "@/hooks/useBookingExport";

// Types
export type {
  Booking,
  BookingStatus,
  PaymentStatus,
  BookingSource,
  BookingRoom,
  SelectedRoom,
  RoomTypeAvailability,
  BookingAddon,
  EditBookingData,
  CustomPriceMode,
} from "@/types/booking.types";
