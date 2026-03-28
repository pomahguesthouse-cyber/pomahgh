import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay, isSameDay, parseISO, differenceInDays, getDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileBookingEditDialog } from "./MobileBookingEditDialog";

// Reuse the same color logic as backend
const getBookingColor = (status: string, checkOutTime?: string | null): string => {
  const isLateCheckout = checkOutTime && checkOutTime !== "12:00:00";
  if (isLateCheckout) return "from-red-500/90 to-red-600/90";
  switch (status) {
    case "pending": return "from-amber-400/90 to-amber-500/90";
    case "confirmed": return "from-emerald-500/90 to-emerald-600/90";
    case "pending_payment": return "from-orange-400/90 to-orange-500/90";
    case "checked_in": return "from-blue-500/90 to-blue-600/90";
    case "checked_out": return "from-slate-400/90 to-slate-500/90";
    case "cancelled": return "from-red-500/90 to-red-600/90";
    default: return "from-teal-500/90 to-teal-600/90";
  }
};

const STATUS_LEGEND = [
  { status: "confirmed", label: "Confirmed", color: "bg-emerald-500" },
  { status: "pending", label: "Pending", color: "bg-amber-400" },
  { status: "pending_payment", label: "Pending Payment", color: "bg-orange-400" },
  { status: "checked_in", label: "Checked In", color: "bg-blue-500" },
  { status: "checked_out", label: "Checked Out", color: "bg-slate-400" },
  { status: "cancelled", label: "Cancelled", color: "bg-red-500" },
];

const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

interface CalendarBooking {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  room_id: string;
  check_in: string;
  check_out: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  allocated_room_number: string | null;
  total_nights: number;
  total_price: number;
  num_guests: number;
  special_requests: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  booking_code: string;
  booking_rooms?: Array<{
    id: string;
    room_id: string;
    room_number: string;
    price_per_night: number;
  }>;
}

interface Room {
  id: string;
  name: string;
  allotment: number;
  room_numbers: string[] | null;
  price_per_night: number;
}

export const MobileCalendarTab = () => {
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const queryClient = useQueryClient();
  const daysToShow = 7;
  const cellWidth = 48; // px per day column

  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

  const { data: rooms = [] } = useQuery({
    queryKey: ["mobile-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, allotment, room_numbers, price_per_night")
        .eq("available", true)
        .order("name");
      if (error) throw error;
      return data as Room[];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["mobile-calendar-bookings", startDate.toISOString()],
    queryFn: async () => {
      const from = format(startDate, "yyyy-MM-dd");
      const to = format(addDays(startDate, daysToShow), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, guest_name, guest_email, guest_phone, room_id, check_in, check_out,
          check_in_time, check_out_time, status, allocated_room_number, total_nights,
          total_price, num_guests, special_requests, payment_status, payment_amount,
          booking_code,
          booking_rooms (id, room_id, room_number, price_per_night)
        `)
        .gte("check_out", from)
        .lte("check_in", to)
        .not("status", "eq", "cancelled");
      if (error) throw error;
      return data as CalendarBooking[];
    },
  });

  // Build room rows: each room_number gets its own row grouped by room type
  const roomRows = useMemo(() => {
    const rows: Array<{ roomId: string; roomName: string; roomNumber: string }> = [];
    rooms.forEach((room) => {
      const numbers = (room.room_numbers || []) as string[];
      if (numbers.length > 0) {
        numbers.forEach((rn) => rows.push({ roomId: room.id, roomName: room.name, roomNumber: rn }));
      } else {
        rows.push({ roomId: room.id, roomName: room.name, roomNumber: room.name });
      }
    });
    return rows;
  }, [rooms]);

  // Group rows by room type name
  const roomsByType = useMemo(() => {
    const groups: Record<string, typeof roomRows> = {};
    roomRows.forEach((row) => {
      if (!groups[row.roomName]) groups[row.roomName] = [];
      groups[row.roomName].push(row);
    });
    return groups;
  }, [roomRows]);

  // Find booking for a specific room number + date (start cell detection)
  const getBookingForCell = (roomNumber: string, date: Date): CalendarBooking | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.find((b) => {
      const matchRoom = b.allocated_room_number === roomNumber;
      if (!matchRoom) return false;
      return dateStr >= b.check_in && dateStr < b.check_out;
    }) || null;
  };

  const handleSaveBooking = async (updates: Record<string, any>) => {
    if (!selectedBooking) return;
    const { error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", selectedBooking.id);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["mobile-calendar-bookings"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
  };

  const firstVisibleStr = format(startDate, "yyyy-MM-dd");

  return (
    <div className="p-3 space-y-3">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setStartDate((d) => addDays(d, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {format(startDate, "d MMM", { locale: localeId })} - {format(addDays(startDate, daysToShow - 1), "d MMM yyyy", { locale: localeId })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setStartDate((d) => addDays(d, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs"
        onClick={() => setStartDate(startOfDay(new Date()))}
      >
        Hari Ini
      </Button>

      {/* Calendar grid - matching backend style */}
      <div className="overflow-x-auto -mx-3 px-3">
        <table
          className="border-collapse table-fixed"
          style={{ width: days.length * cellWidth + 80 }}
        >
          {/* Header row */}
          <thead className="sticky top-0 z-50">
            <tr className="bg-muted/50">
              <th
                className="sticky left-0 z-50 border border-border p-1 shadow-lg backdrop-blur-md bg-[#97c6d8] text-white"
                style={{ width: 80, minWidth: 80 }}
              >
                <span className="text-[8px] font-bold uppercase tracking-wide">KAMAR</span>
              </th>
              {days.map((day) => {
                const dayIndex = getDay(day);
                const isWeekend = dayIndex === 0 || dayIndex === 6;
                const isToday = isSameDay(day, new Date());

                return (
                  <th
                    key={day.toISOString()}
                    className={cn(
                      "border border-border p-0.5 text-center transition-colors relative backdrop-blur-md shadow-sm",
                      isWeekend ? "bg-red-100/70 dark:bg-red-950/40" : "bg-white/60 dark:bg-gray-800/60"
                    )}
                    style={{ width: cellWidth, minWidth: cellWidth, maxWidth: cellWidth }}
                  >
                    {/* Center divider */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/40 -translate-x-px pointer-events-none" />

                    {/* TODAY badge */}
                    {isToday && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[6px] px-1 py-0.5 rounded-b-full font-bold shadow-md">
                        TODAY
                      </div>
                    )}

                    <div className={cn(
                      "text-[8px] font-medium uppercase",
                      isWeekend ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {DAY_NAMES_SHORT[dayIndex]}
                    </div>
                    <div className={cn(
                      "text-sm font-bold",
                      isWeekend && "text-red-600"
                    )}>
                      {format(day, "d")}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={daysToShow + 1} className="text-center py-8 text-muted-foreground text-sm">
                  Tidak ada kamar aktif
                </td>
              </tr>
            ) : (
              Object.entries(roomsByType).map(([roomType, rows]) => (
                <React.Fragment key={roomType}>
                  {/* Room type header - same as backend */}
                  <tr className="border-y border-border">
                    <td
                      className="sticky left-0 z-30 p-1 px-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground bg-stone-200 dark:bg-stone-800 shadow-sm border-r border-border"
                    >
                      {roomType}
                    </td>
                    {days.map((date) => (
                      <td key={date.toISOString()} className="bg-stone-200 dark:bg-stone-800 border border-border" />
                    ))}
                  </tr>

                  {/* Room number rows */}
                  {rows.map((row) => (
                    <tr key={`${row.roomId}-${row.roomNumber}`} className="border-b border-border">
                      {/* Room number cell */}
                      <td className="sticky left-0 z-20 p-1 px-2 text-[10px] font-medium bg-card border-r border-border shadow-sm whitespace-nowrap"
                        style={{ width: 80, minWidth: 80 }}
                      >
                        {row.roomNumber}
                      </td>

                      {/* Date cells with booking bars */}
                      {days.map((date) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const booking = getBookingForCell(row.roomNumber, date);
                        const dayIndex = getDay(date);
                        const isWeekend = dayIndex === 0 || dayIndex === 6;

                        // Determine if booking bar should start rendering here
                        const isStart = booking
                          ? booking.check_in === dateStr ||
                            (booking.check_in < firstVisibleStr && dateStr === firstVisibleStr && booking.check_out > dateStr)
                          : false;

                        const isTruncatedLeft = booking && booking.check_in < firstVisibleStr && dateStr === firstVisibleStr;

                        // Calculate visible nights for this booking
                        let visibleNights = booking?.total_nights || 0;
                        if (isTruncatedLeft && booking) {
                          visibleNights = differenceInDays(parseISO(booking.check_out), startDate);
                        }

                        return (
                          <td
                            key={dateStr}
                            className={cn(
                              "border border-border p-0 relative transition-all duration-200 overflow-visible",
                              isWeekend ? "bg-red-50/20 dark:bg-red-950/10" : "bg-background"
                            )}
                            style={{ width: cellWidth, minWidth: cellWidth, maxWidth: cellWidth, height: 40 }}
                          >
                            {/* Center divider like backend */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/30 -translate-x-px pointer-events-none" />

                            {/* Booking bar - spans across cells */}
                            {booking && isStart && (
                              <div
                                onClick={() => setSelectedBooking(booking)}
                                className={cn(
                                  "absolute top-0.5 bottom-0.5 bg-gradient-to-r flex items-center text-xs shadow-sm active:brightness-90 transition-all cursor-pointer",
                                  isTruncatedLeft ? "rounded-r-md" : "rounded-md",
                                  getBookingColor(booking.status, booking.check_out_time)
                                )}
                                style={{
                                  left: isTruncatedLeft ? 0 : cellWidth / 2,
                                  width: visibleNights * cellWidth + (isTruncatedLeft ? cellWidth / 2 : 0),
                                  zIndex: 5,
                                }}
                              >
                                {/* Guest name & nights */}
                                <div className="px-1.5 py-0.5 flex-1 min-w-0 ml-1">
                                  <div className="font-bold text-[9px] text-white drop-shadow-sm truncate">
                                    {booking.guest_name.split(" ")[0]}
                                  </div>
                                  <div className="text-[8px] text-white/80 font-medium truncate">
                                    {booking.total_nights}M
                                  </div>
                                </div>

                                {/* LCO badge */}
                                {booking.check_out_time && booking.check_out_time !== "12:00:00" && (
                                  <div className="absolute -right-0.5 -top-1 z-30">
                                    <div className="bg-red-600 text-white text-[6px] px-0.5 py-0.5 rounded-sm font-bold shadow-sm">
                                      LCO
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legend - matching backend style */}
      <div className="flex flex-wrap gap-2 pt-2">
        {STATUS_LEGEND.map(({ status, label, color }) => (
          <div key={status} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <MobileBookingEditDialog
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
        onSave={handleSaveBooking}
        rooms={rooms}
      />
    </div>
  );
};
