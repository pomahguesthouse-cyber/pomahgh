import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface BookingConflictCheck {
  roomId: string;
  roomNumber: string;
  checkIn: Date;
  checkOut: Date;
  checkInTime?: string;
  checkOutTime?: string;
  excludeBookingId?: string;
}

export const useBookingValidation = () => {
  const checkBookingConflict = async ({
    roomId,
    roomNumber,
    checkIn,
    checkOut,
    checkInTime = "14:00:00",
    checkOutTime = "12:00:00",
    excludeBookingId
  }: BookingConflictCheck) => {
    const checkInStr = format(checkIn, "yyyy-MM-dd");
    const checkOutStr = format(checkOut, "yyyy-MM-dd");

    // Query overlapping bookings
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("room_id", roomId)
      .eq("allocated_room_number", roomNumber)
      .neq("status", "cancelled")
      .or(`and(check_in.lte.${checkOutStr},check_out.gte.${checkInStr})`);

    if (error) {
      console.error("Error checking booking conflict:", error);
      return { hasConflict: false };
    }

    if (!bookings || bookings.length === 0) {
      return { hasConflict: false };
    }

    // Filter out the current booking if updating
    const otherBookings = excludeBookingId
      ? bookings.filter(b => b.id !== excludeBookingId)
      : bookings;

    // Check for actual time conflicts
    for (const existing of otherBookings) {
      const existingCheckIn = existing.check_in;
      const existingCheckOut = existing.check_out;
      const existingCheckInTime = existing.check_in_time || "14:00:00";
      const existingCheckOutTime = existing.check_out_time || "12:00:00";

      // Case 1: Same check-in date - conflict if new check-in time < existing check-out time
      if (checkInStr === existingCheckIn) {
        if (checkInTime < existingCheckOutTime) {
          return { 
            hasConflict: true, 
            conflictingBooking: existing,
            reason: `Kamar belum tersedia. Check-out tamu sebelumnya jam ${existingCheckOutTime.slice(0, 5)}`
          };
        }
      }

      // Case 2: Same check-out date - conflict if new check-out time > existing check-in time
      if (checkOutStr === existingCheckOut) {
        if (checkOutTime > existingCheckInTime) {
          return { 
            hasConflict: true, 
            conflictingBooking: existing,
            reason: `Kamar sudah dibooking untuk tamu berikutnya. Check-in jam ${existingCheckInTime.slice(0, 5)}`
          };
        }
      }

      // Case 3: Date ranges overlap (standard overlap check)
      if (
        (checkInStr >= existingCheckIn && checkInStr < existingCheckOut) ||
        (checkOutStr > existingCheckIn && checkOutStr <= existingCheckOut) ||
        (checkInStr <= existingCheckIn && checkOutStr >= existingCheckOut)
      ) {
        return { 
          hasConflict: true, 
          conflictingBooking: existing,
          reason: `Kamar sudah dibooking untuk tanggal ${existingCheckIn} - ${existingCheckOut}`
        };
      }
    }

    return { hasConflict: false };
  };

  const checkRoomTypeAvailability = async ({
    roomId,
    checkIn,
    checkOut,
    excludeBookingId
  }: {
    roomId: string;
    checkIn: Date;
    checkOut: Date;
    excludeBookingId?: string;
  }) => {
    const checkInStr = format(checkIn, "yyyy-MM-dd");
    const checkOutStr = format(checkOut, "yyyy-MM-dd");

    // Get room info
    const { data: room } = await supabase
      .from("rooms")
      .select("room_numbers")
      .eq("id", roomId)
      .single();

    if (!room || !room.room_numbers) {
      return { availableRooms: [] };
    }

    // Query overlapping bookings for this room type
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("allocated_room_number")
      .eq("room_id", roomId)
      .neq("status", "cancelled")
      .or(`and(check_in.lte.${checkOutStr},check_out.gte.${checkInStr})`);

    if (error) {
      console.error("Error checking room type availability:", error);
      return { availableRooms: room.room_numbers };
    }

    // Filter out the current booking if updating
    const otherBookings = excludeBookingId
      ? (bookings || []).filter((b: any) => b.id !== excludeBookingId)
      : bookings || [];

    const bookedRoomNumbers = otherBookings
      .map((b: any) => b.allocated_room_number)
      .filter(Boolean);

    const availableRooms = room.room_numbers.filter(
      rn => !bookedRoomNumbers.includes(rn)
    );

    return { availableRooms };
  };

  return {
    checkBookingConflict,
    checkRoomTypeAvailability
  };
};
