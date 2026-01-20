/**
 * Booking Feature Module
 * Exports all booking-related components, hooks, services, and mappers
 */

// Components
export * from "./components";

// Hooks
export { useBooking, useBookingValidation, useBookingExport } from "./hooks";
export type { BookingData } from "./hooks";

// Services
export { bookingService } from "./services";
export type { CreateBookingInput, UpdateBookingInput } from "./services";

// Mappers
export { bookingMapper } from "./mappers";
export type {
  BookingDTO,
  BookingRoomDTO,
  BookingListItem,
  BookingCalendarItem,
} from "./mappers";

// Utils
export { bookingPermissions, bookingValidation } from "./utils";
export type { 
  UserRole,
  BookingValidationResult,
  BookingDates,
  BookingGuestInfo,
} from "./utils";

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












