/**
 * useBookingValidation hook
 * Provides validation functions for booking conflicts and room availability
 */
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

    // Query overlapping bookings from direct allocations
    const { data: directBookings, error: directError } = await supabase
      .from("bookings")
      .select("*")
      .eq("room_id", roomId)
      .eq("allocated_room_number", roomNumber)
      .neq("status", "cancelled")
      .or(`and(check_in.lte.${checkOutStr},check_out.gte.${checkInStr})`);

    if (directError) {
      console.error("Error checking booking conflict:", directError);
      return { hasConflict: false };
    }

    // Query overlapping bookings from booking_rooms table (multi-room bookings)
    const { data: bookingRoomsData, error: bookingRoomsError } = await supabase
      .from("booking_rooms")
      .select(`
        room_number,
        booking_id,
        bookings!inner(id, check_in, check_out, status, guest_name)
      `)
      .eq("room_id", roomId)
      .eq("room_number", roomNumber);

    if (bookingRoomsError) {
      console.error("Error checking booking_rooms conflict:", bookingRoomsError);
    }

    // Filter booking_rooms for overlapping dates and non-cancelled status
    const overlappingBookingRooms = (bookingRoomsData || []).filter((br: any) => {
      const booking = br.bookings;
      if (!booking || booking.status === "cancelled") return false;
      return booking.check_in <= checkOutStr && booking.check_out >= checkInStr;
    });

    // Combine all bookings
    const allBookings = [
      ...(directBookings || []),
      ...overlappingBookingRooms.map((br: any) => ({
        ...br.bookings,
        allocated_room_number: br.room_number
      }))
    ];

    // Remove duplicates by booking id
    const uniqueBookings = allBookings.filter((booking, index, self) =>
      index === self.findIndex(b => b.id === booking.id)
    );

    if (uniqueBookings.length === 0) {
      return { hasConflict: false };
    }

    // Filter out the current booking if updating
    const otherBookings = excludeBookingId
      ? uniqueBookings.filter(b => b.id !== excludeBookingId)
      : uniqueBookings;

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

    const unavailableRoomNumbers = new Set<string>();

    // Check blocked dates (room_unavailable_dates)
    const { data: blockedDates, error: blockedError } = await supabase
      .from("room_unavailable_dates")
      .select("room_number, unavailable_date")
      .eq("room_id", roomId)
      .gte("unavailable_date", checkInStr)
      .lt("unavailable_date", checkOutStr);

    if (blockedError) {
      console.error("Error checking blocked dates:", blockedError);
    } else {
      (blockedDates || []).forEach((bd) => {
        if (!bd.room_number) {
          // If no specific room_number, block all rooms of this type
          room.room_numbers.forEach(rn => unavailableRoomNumbers.add(rn));
        } else {
          unavailableRoomNumbers.add(bd.room_number);
        }
      });
    }

    // Query overlapping bookings from direct allocations
    const { data: directBookings, error: directError } = await supabase
      .from("bookings")
      .select("id, allocated_room_number")
      .eq("room_id", roomId)
      .neq("status", "cancelled")
      .or(`and(check_in.lte.${checkOutStr},check_out.gte.${checkInStr})`);

    if (directError) {
      console.error("Error checking room type availability:", directError);
    } else {
      (directBookings || []).forEach((b: any) => {
        if (excludeBookingId && b.id === excludeBookingId) return;
        if (b.allocated_room_number) {
          unavailableRoomNumbers.add(b.allocated_room_number);
        }
      });
    }

    // Query overlapping bookings from booking_rooms table
    const { data: bookingRoomsData, error: bookingRoomsError } = await supabase
      .from("booking_rooms")
      .select(`
        room_number,
        booking_id,
        bookings!inner(id, check_in, check_out, status)
      `)
      .eq("room_id", roomId);

    if (bookingRoomsError) {
      console.error("Error checking booking_rooms availability:", bookingRoomsError);
    } else {
      // Filter booking_rooms for overlapping dates
      (bookingRoomsData || []).forEach((br: any) => {
        const booking = br.bookings;
        if (!booking || booking.status === "cancelled") return;
        if (excludeBookingId && booking.id === excludeBookingId) return;
        if (booking.check_in <= checkOutStr && booking.check_out >= checkInStr) {
          if (br.room_number) {
            unavailableRoomNumbers.add(br.room_number);
          }
        }
      });
    }

    const availableRooms = room.room_numbers.filter(
      rn => !unavailableRoomNumbers.has(rn)
    );

    return { availableRooms };
  };

  return {
    checkBookingConflict,
    checkRoomTypeAvailability
  };
};
