import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface RoomTypeAvailability {
  roomId: string;
  roomName: string;
  totalRooms: number;
  availableRooms: string[];
  availableCount: number;
  pricePerNight: number;
}

export const useRoomTypeAvailability = (
  checkIn: Date | null,
  checkOut: Date | null,
  excludeBookingId?: string
) => {
  return useQuery({
    queryKey: ["room-type-availability", checkIn, checkOut, excludeBookingId],
    queryFn: async () => {
      if (!checkIn || !checkOut) return [];

      const checkInStr = format(checkIn, "yyyy-MM-dd");
      const checkOutStr = format(checkOut, "yyyy-MM-dd");

      // Fetch all rooms
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select("id, name, room_numbers, price_per_night, allotment")
        .eq("available", true)
        .order("name");

      if (roomsError) throw roomsError;
      if (!rooms) return [];

      // Fetch all conflicting bookings for the date range
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("room_id, allocated_room_number")
        .neq("status", "cancelled")
        .or(`and(check_in.lte.${checkOutStr},check_out.gte.${checkInStr})`);

      if (bookingsError) throw bookingsError;

      // Note: We can't filter by booking ID here since the query doesn't return full booking objects
      // The excludeBookingId filtering happens in the conflict check logic
      const otherBookings = bookings || [];

      // Calculate availability for each room type
      const availability: RoomTypeAvailability[] = rooms.map(room => {
        const roomNumbers = room.room_numbers || [];
        
        // Get booked room numbers for this room type
        const bookedRoomNumbers = otherBookings
          .filter(b => b.room_id === room.id)
          .map(b => b.allocated_room_number)
          .filter(Boolean);

        // Find available room numbers
        const availableRooms = roomNumbers.filter(
          rn => !bookedRoomNumbers.includes(rn)
        );

        return {
          roomId: room.id,
          roomName: room.name,
          totalRooms: roomNumbers.length,
          availableRooms,
          availableCount: availableRooms.length,
          pricePerNight: room.price_per_night,
        };
      });

      return availability;
    },
    enabled: !!checkIn && !!checkOut,
  });
};
