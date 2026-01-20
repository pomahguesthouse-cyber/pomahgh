import { Booking } from "../types";

// ================= STATUS VARIANT =================
export const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmed":
    case "checked_in":
      return "default";

    case "pending":
      return "secondary";

    case "checked_out":
      return "outline";

    case "cancelled":
    case "no_show":
      return "destructive";

    default:
      return "outline";
  }
};

// ================= PAYMENT VARIANT =================
export const getPaymentVariant = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "paid":
      return "default";

    case "down_payment":
      return "secondary";

    case "unpaid":
      return "destructive";

    default:
      return "outline";
  }
};

// ================= BOOKING COLOR =================
export const getBookingColor = (booking: Booking): string => {
  const isLateCheckout = booking.check_out_time && booking.check_out_time !== "12:00:00";

  // 🚨 Late checkout = prioritas tertinggi
  if (isLateCheckout) {
    return "from-red-500/90 to-red-600/90";
  }

  switch (booking.status) {
    case "pending":
      return "from-amber-400/90 to-amber-500/90";

    case "confirmed":
      return "from-emerald-500/90 to-emerald-600/90";

    case "checked_in":
      return "from-blue-500/90 to-blue-600/90";

    case "checked_out":
      return "from-slate-400/90 to-slate-500/90";

    case "cancelled":
      return "from-red-500/90 to-red-600/90";

    case "no_show":
      return "from-purple-500/90 to-purple-600/90";

    default: {
      // 🎨 Fallback warna deterministic berdasarkan booking.id
      const colors = [
        "from-blue-500/90 to-blue-600/90",
        "from-teal-500/90 to-teal-600/90",
        "from-indigo-500/90 to-indigo-600/90",
        "from-cyan-500/90 to-cyan-600/90",
      ];

      const colorIndex = booking.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

      return colors[colorIndex];
    }
  }
};












