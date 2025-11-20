import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  status: string;
}

interface RoomAvailabilityCalendarProps {
  roomId: string;
  roomName: string;
  totalRooms: number;
}

export const RoomAvailabilityCalendar = ({ 
  roomId, 
  roomName,
  totalRooms 
}: RoomAvailabilityCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["room-bookings", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("room_id", roomId)
        .in("status", ["confirmed", "pending"])
        .order("check_in", { ascending: true });

      if (error) throw error;
      return data as Booking[];
    },
  });

  const getBookingsForDate = (date: Date) => {
    if (!bookings) return [];
    
    return bookings.filter((booking) => {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      
      return isWithinInterval(date, {
        start: checkIn,
        end: checkOut,
      }) || isSameDay(date, checkIn) || isSameDay(date, checkOut);
    });
  };

  const getAvailabilityForDate = (date: Date) => {
    const bookedCount = getBookingsForDate(date).length;
    const available = totalRooms - bookedCount;
    return { booked: bookedCount, available };
  };

  const modifiers = {
    booked: (date: Date) => {
      const { available } = getAvailabilityForDate(date);
      return available === 0;
    },
    partial: (date: Date) => {
      const { booked, available } = getAvailabilityForDate(date);
      return booked > 0 && available > 0;
    },
  };

  const modifiersClassNames = {
    booked: "bg-destructive text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground",
    partial: "bg-orange-500 text-white hover:bg-orange-600 hover:text-white",
  };

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : [];
  const selectedDateAvailability = selectedDate ? getAvailabilityForDate(selectedDate) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{roomName} - Availability Calendar</CardTitle>
        <div className="flex gap-4 text-sm mt-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span>Partially Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive"></div>
            <span>Fully Booked</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className={cn("rounded-md border pointer-events-auto")}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
            />
          </div>
          
          <div className="space-y-4">
            {selectedDate && (
              <>
                <div>
                  <h3 className="font-semibold mb-2">
                    {format(selectedDate, "MMMM d, yyyy")}
                  </h3>
                  {selectedDateAvailability && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                        <span>Total Rooms:</span>
                        <Badge variant="outline">{totalRooms}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                        <span>Booked:</span>
                        <Badge variant="destructive">{selectedDateAvailability.booked}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                        <span>Available:</span>
                        <Badge variant="default">{selectedDateAvailability.available}</Badge>
                      </div>
                    </div>
                  )}
                </div>

                {selectedDateBookings.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Bookings on this date:</h4>
                    <div className="space-y-2">
                      {selectedDateBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="p-3 border rounded-lg space-y-1"
                        >
                          <p className="font-medium">{booking.guest_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.check_in), "MMM d")} -{" "}
                            {format(new Date(booking.check_out), "MMM d, yyyy")}
                          </p>
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDateBookings.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No bookings on this date
                  </div>
                )}
              </>
            )}

            {isLoading && (
              <div className="text-center text-muted-foreground">
                Loading bookings...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
