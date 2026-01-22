import { cn } from "@/lib/utils";

export type BookingStatus = "confirmed" | "checked_in" | "checked_out" | "cancelled" | "pending" | string;

export interface BookingBarData {
  id: string;
  guest_name?: string | null;
  customer_name?: string | null;
  status: BookingStatus;
}

interface BookingBarProps {
  booking: BookingBarData;
}

export function BookingBar({ booking }: BookingBarProps) {
  // ===== SAFE NAME HANDLING =====
  const rawName = booking.guest_name?.trim() || booking.customer_name?.trim() || "Guest";

  const displayName = rawName.length > 12 ? rawName.slice(0, 12) + "…" : rawName;

  // ===== STATUS COLOR =====
  const statusClass =
    {
      confirmed: "bg-emerald-500",
      checked_in: "bg-blue-500",
      checked_out: "bg-slate-500",
      cancelled: "bg-red-500",
      pending: "bg-amber-500",
    }[booking.status] ?? "bg-gray-400";

  return (
    <div
      className={cn(
        "h-full w-full rounded-md px-1 py-[2px]",
        "flex flex-col justify-center",
        "cursor-pointer select-none",
        "shadow-sm",
        statusClass,
      )}
      title={rawName}
      data-booking-id={booking.id}
    >
      {/* Guest Name */}
      <div className="font-bold text-[9px] md:text-xs text-white truncate leading-tight">{displayName}</div>

      {/* Status */}
      <div className="text-[8px] text-white/80 uppercase tracking-wide leading-tight">
        {booking.status.replace("_", " ")}
      </div>
    </div>
  );
}

export default BookingBar;
