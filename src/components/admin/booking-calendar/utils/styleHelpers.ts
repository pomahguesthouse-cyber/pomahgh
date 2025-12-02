import { Booking } from "../types";

export const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "default";
    case "pending":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

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

export const getBookingColor = (booking: Booking): string => {
  const isPending = booking.status === "pending";
  const isLateCheckout = booking.check_out_time && booking.check_out_time !== "12:00:00";

  if (isLateCheckout) {
    return "from-red-500/90 to-red-600/90";
  }

  if (isPending) {
    return "from-amber-400/90 to-amber-500/90";
  }

  const colors = [
    "from-blue-500/90 to-blue-600/90",
    "from-emerald-500/90 to-emerald-600/90",
    "from-purple-500/90 to-purple-600/90",
    "from-teal-500/90 to-teal-600/90",
    "from-indigo-500/90 to-indigo-600/90",
    "from-cyan-500/90 to-cyan-600/90",
    "from-sky-500/90 to-sky-600/90",
  ];
  
  const colorIndex = booking.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[colorIndex];
};
