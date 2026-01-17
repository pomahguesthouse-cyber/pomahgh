/**
 * Booking Feature Module
 * Exports all booking-related components, hooks, services, and mappers
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

// Services
export { bookingService } from "./services/booking.service";
export type { CreateBookingInput, UpdateBookingInput } from "./services/booking.service";

// Mappers
export { bookingMapper } from "./mappers/booking.mapper";
export type {
  BookingDTO,
  BookingRoomDTO,
  BookingListItem,
  BookingCalendarItem,
} from "./mappers/booking.mapper";

// Utils
export { bookingPermissions } from "./utils/booking.permissions";
export type { UserRole } from "./utils/booking.permissions";
export { bookingValidation } from "./utils/booking.validation";
export type {
  BookingValidationResult,
  BookingDates,
  BookingGuestInfo,
} from "./utils/booking.validation";

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
