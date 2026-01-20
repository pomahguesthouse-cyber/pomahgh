// Booking Status Types (strict union)
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

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
  no_show: "No Show",
};

// Status badge colors
export const STATUS_BADGE_COLORS: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/30 dark:text-emerald-400",
  checked_in: "bg-blue-100 text-blue-700 border-0 dark:bg-blue-900/30 dark:text-blue-400",
  checked_out: "bg-slate-100 text-slate-600 border-0 dark:bg-slate-800 dark:text-slate-400",
  cancelled: "bg-red-100 text-red-700 border-0 dark:bg-red-900/30 dark:text-red-400",
  no_show: "bg-purple-100 text-purple-700 border-0 dark:bg-purple-900/30 dark:text-purple-400",
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












