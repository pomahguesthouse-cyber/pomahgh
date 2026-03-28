import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay, isSameDay, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileBookingEditDialog } from "./MobileBookingEditDialog";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500",
  pending: "bg-yellow-500",
  pending_payment: "bg-orange-500",
  checked_in: "bg-blue-500",
  checked_out: "bg-gray-400",
  cancelled: "bg-red-500",
};

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

export const MobileCalendarTab = () => {
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const queryClient = useQueryClient();
  const daysToShow = 7;

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
      return data;
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

  const getBookingsForCell = (roomId: string, day: Date) => {
    return bookings.filter((b) => {
      if (b.room_id !== roomId) return false;
      const checkIn = parseISO(b.check_in);
      const checkOut = parseISO(b.check_out);
      return day >= startOfDay(checkIn) && day < startOfDay(checkOut);
    });
  };

  const handleBookingTap = (booking: CalendarBooking) => {
    setSelectedBooking(booking);
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

  return (
    <div className="p-3 space-y-3">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setStartDate((d) => addDays(d, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {format(startDate, "d MMM", { locale: id })} - {format(addDays(startDate, daysToShow - 1), "d MMM yyyy", { locale: id })}
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

      {/* Calendar grid */}
      <div className="overflow-x-auto -mx-3 px-3">
        <table className="w-full min-w-[500px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-card z-10 text-left p-2 border-b border-border font-medium text-muted-foreground w-24">
                Kamar
              </th>
              {days.map((day) => (
                <th
                  key={day.toISOString()}
                  className={`p-2 border-b border-border text-center font-medium min-w-[60px] ${
                    isSameDay(day, new Date()) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div>{format(day, "EEE", { locale: id })}</div>
                  <div className="text-sm font-semibold">{format(day, "d")}</div>
                </th>
              ))}
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
              rooms.map((room) => {
                const roomNumbers = (room.room_numbers || []) as string[];
                // If room has numbered units, show each; otherwise show 1 row
                const rows = roomNumbers.length > 0 ? roomNumbers : [null];
                
                return rows.map((roomNumber, idx) => (
                  <tr key={`${room.id}-${roomNumber || idx}`} className="border-b border-border/50">
                    <td className="sticky left-0 bg-card z-10 p-2 font-medium text-foreground text-[11px] whitespace-nowrap">
                      {idx === 0 ? (
                        <div>
                          <div className="font-semibold">{room.name}</div>
                          {roomNumber && <div className="text-muted-foreground text-[10px]">#{roomNumber}</div>}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-[10px] pl-1">#{roomNumber}</div>
                      )}
                    </td>
                    {days.map((day) => {
                      const cellBookings = getBookingsForCell(room.id, day).filter(
                        (b) => !roomNumber || b.allocated_room_number === roomNumber || !b.allocated_room_number
                      );
                      return (
                        <td key={day.toISOString()} className="p-0.5 align-top min-h-[36px]">
                          {cellBookings.map((b) => (
                            <button
                              key={b.id}
                              onClick={() => handleBookingTap(b)}
                              className={`${STATUS_COLORS[b.status] || "bg-gray-400"} text-white rounded px-1 py-0.5 text-[9px] leading-tight mb-0.5 truncate block w-full text-left active:opacity-70 transition-opacity`}
                              title={`${b.guest_name} (${b.allocated_room_number || "-"})`}
                            >
                              {b.guest_name.split(" ")[0]}
                            </button>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-2">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {status.replace(/_/g, " ")}
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
