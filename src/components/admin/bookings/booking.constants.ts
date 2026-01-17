// Booking Status Types (strict union)
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

// Payment Status Types (strict union)
export type PaymentStatus =
  | "paid"
  | "unpaid"
  | "pay_at_hotel"
  | "partial";

// Status label mappings
export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
};

// Payment status label mappings
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Lunas",
  unpaid: "Belum Bayar",
  pay_at_hotel: "Bayar di Hotel",
  partial: "DP/Sebagian",
};

// Payment status text colors
export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  paid: "text-green-600",
  unpaid: "text-red-500",
  pay_at_hotel: "text-blue-600",
  partial: "text-orange-500",
};

// Payment badge colors
export const PAYMENT_BADGE_COLORS: Record<PaymentStatus, string> = {
  paid: "bg-teal-500 text-white hover:bg-teal-500",
  unpaid: "bg-red-500 text-white hover:bg-red-500",
  pay_at_hotel: "bg-blue-500 text-white hover:bg-blue-500",
  partial: "bg-orange-500 text-white hover:bg-orange-500",
};
