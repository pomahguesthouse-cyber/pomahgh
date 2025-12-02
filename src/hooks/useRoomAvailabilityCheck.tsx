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

      // Get all rooms with their allotments and room_numbers
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select("id, allotment, room_numbers")
        .eq("available", true);

      if (roomsError) throw roomsError;

      // Get unavailable dates for all rooms (with room_number for per-unit blocking)
      const { data: unavailableDates, error: unavailableError } = await supabase
        .from("room_unavailable_dates")
        .select("room_id, room_number, unavailable_date")
        .gte("unavailable_date", checkInStr)
        .lt("unavailable_date", checkOutStr);

      if (unavailableError) throw unavailableError;

      // Get booked rooms from booking_rooms table (for multi-room bookings)
      const { data: bookedRooms, error: bookedRoomsError } = await supabase
        .from("booking_rooms")
        .select(`
          room_id,
          room_number,
          booking:bookings!inner(
            check_in,
            check_out,
            status
          )
        `);

      if (bookedRoomsError) throw bookedRoomsError;

      // Also get direct bookings (for backward compatibility with single-room bookings)
      const { data: directBookings, error: directBookingsError } = await supabase
        .from("bookings")
        .select("room_id, allocated_room_number, check_in, check_out, status")
        .not("status", "in", '("cancelled","rejected")')
        .lt("check_in", checkOutStr)
        .gt("check_out", checkInStr);

      if (directBookingsError) throw directBookingsError;

      // Calculate availability for each room
      const availability: AvailabilityResult = {};

      rooms?.forEach((room) => {
        const roomNumbers = (room.room_numbers as string[]) || [];
        const totalUnits = roomNumbers.length || room.allotment;
        
        // Set to track unavailable room_numbers for this room type
        const unavailableRoomNumbers = new Set<string>();

        // 1. Check blocked dates per room_number
        unavailableDates?.forEach((ud) => {
          if (ud.room_id === room.id) {
            if (!ud.room_number) {
              // NULL room_number = block ALL units of this room type
              roomNumbers.forEach(rn => unavailableRoomNumbers.add(rn));
            } else {
              // Specific room_number blocked
              unavailableRoomNumbers.add(ud.room_number);
            }
          }
        });

        // 2. Check bookings from booking_rooms table
        bookedRooms?.forEach((br) => {
          if (br.room_id === room.id && br.room_number) {
            const booking = br.booking as any;
            // Check if booking is active and overlaps with date range
            if (
              booking &&
              booking.status !== "cancelled" &&
              booking.status !== "rejected" &&
              booking.check_in < checkOutStr &&
              booking.check_out > checkInStr
            ) {
              unavailableRoomNumbers.add(br.room_number);
            }
          }
        });

        // 3. Check direct bookings (for backward compatibility)
        directBookings?.forEach((booking) => {
          if (booking.room_id === room.id && booking.allocated_room_number) {
            unavailableRoomNumbers.add(booking.allocated_room_number);
          }
        });

        // Calculate available count
        availability[room.id] = Math.max(0, totalUnits - unavailableRoomNumbers.size);
      });

      return availability;
    },
    enabled: !!checkIn && !!checkOut,
  });
};
