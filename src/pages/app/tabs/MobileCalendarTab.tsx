import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500",
  pending: "bg-yellow-500",
  pending_payment: "bg-orange-500",
  checked_in: "bg-blue-500",
  checked_out: "bg-gray-400",
  cancelled: "bg-red-500",
};

export const MobileCalendarTab = () => {
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const daysToShow = 7;

  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));

  const { data: rooms = [] } = useQuery({
    queryKey: ["mobile-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, allotment")
        .eq("is_active", true)
        .order("display_order");
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
        .select("id, guest_name, room_id, check_in, check_out, status, allocated_room_number")
        .gte("check_out", from)
        .lte("check_in", to)
        .not("status", "eq", "cancelled");
      if (error) throw error;
      return data;
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
            {rooms.map((room) => (
              <tr key={room.id} className="border-b border-border/50">
                <td className="sticky left-0 bg-card z-10 p-2 font-medium text-foreground text-xs whitespace-nowrap">
                  {room.name}
                </td>
                {days.map((day) => {
                  const cellBookings = getBookingsForCell(room.id, day);
                  return (
                    <td key={day.toISOString()} className="p-1 align-top">
                      {cellBookings.map((b) => (
                        <div
                          key={b.id}
                          className={`${STATUS_COLORS[b.status] || "bg-gray-400"} text-white rounded px-1 py-0.5 text-[9px] leading-tight mb-0.5 truncate`}
                          title={`${b.guest_name} (${b.allocated_room_number || "-"})`}
                        >
                          {b.guest_name.split(" ")[0]}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-2">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            {status.replace("_", " ")}
          </div>
        ))}
      </div>
    </div>
  );
};
