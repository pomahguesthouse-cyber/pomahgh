import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AvailabilityResult {
  [roomId: string]: number; // roomId -> available count
}

export const useRoomAvailabilityCheck = (checkIn?: Date, checkOut?: Date) => {
  return useQuery({
    queryKey: ["room-availability", checkIn?.toISOString(), checkOut?.toISOString()],
    queryFn: async () => {
      if (!checkIn || !checkOut) return {} as AvailabilityResult;

      // Format dates for database queries
      const checkInStr = checkIn.toISOString().split('T')[0];
      const checkOutStr = checkOut.toISOString().split('T')[0];

      // Get all rooms with their allotments
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select("id, allotment")
        .eq("available", true);

      if (roomsError) throw roomsError;

      // Get unavailable dates for all rooms
      const { data: unavailableDates, error: unavailableError } = await supabase
        .from("room_unavailable_dates")
        .select("room_id")
        .gte("unavailable_date", checkInStr)
        .lt("unavailable_date", checkOutStr);

      if (unavailableError) throw unavailableError;

      // Get bookings that overlap with the date range
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("room_id")
        .not("status", "in", '("cancelled","rejected")')
        .lt("check_in", checkOutStr)
        .gt("check_out", checkInStr);

      if (bookingsError) throw bookingsError;

      // Calculate availability for each room
      const availability: AvailabilityResult = {};

      rooms?.forEach((room) => {
        // Check if room has any unavailable dates in the range
        const hasUnavailableDates = unavailableDates?.some(
          (ud) => ud.room_id === room.id
        );

        if (hasUnavailableDates) {
          availability[room.id] = 0;
          return;
        }

        // Count bookings for this room
        const bookedCount = bookings?.filter(
          (booking) => booking.room_id === room.id
        ).length || 0;

        // Calculate available count
        availability[room.id] = Math.max(0, room.allotment - bookedCount);
      });

      return availability;
    },
    enabled: !!checkIn && !!checkOut,
  });
};
