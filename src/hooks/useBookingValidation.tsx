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
    // STRICT overlap: check_in < newCheckOut AND check_out > newCheckIn
    // (touching dates like old.check_out == new.check_in are NOT overlap — handled by Case A/B time logic)
    const { data: directBookings, error: directError } = await supabase
      .from("bookings")
      .select("*")
      .eq("room_id", roomId)
      .eq("allocated_room_number", roomNumber)
      .not("status", "in", '("cancelled","rejected","no_show")')
      .lt("check_in", checkOutStr)
      .gt("check_out", checkInStr);

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
        bookings!inner(id, check_in, check_out, check_in_time, check_out_time, status, guest_name)
      `)
      .eq("room_id", roomId)
      .eq("room_number", roomNumber);

    if (bookingRoomsError) {
      console.error("Error checking booking_rooms conflict:", bookingRoomsError);
    }

    // Filter booking_rooms for overlapping dates and non-cancelled/no_show status
    interface BookingRoomRow {
      room_number: string;
      booking_id: string;
      bookings: { id: string; check_in: string; check_out: string; status: string; guest_name: string; check_in_time?: string | null; check_out_time?: string | null } | null;
    }

    const overlappingBookingRooms = (bookingRoomsData as BookingRoomRow[] || []).filter((br) => {
      const booking = br.bookings;
      if (!booking) return false;
      if (["cancelled", "rejected", "no_show"].includes(booking.status)) return false;
      // STRICT overlap (same as edge function check-room-availability)
      return booking.check_in < checkOutStr && booking.check_out > checkInStr;
    });

    // Combine all bookings
    const allBookings = [
      ...(directBookings || []),
      ...overlappingBookingRooms.map((br) => ({
        id: br.bookings?.id ?? '',
        check_in: br.bookings?.check_in ?? '',
        check_out: br.bookings?.check_out ?? '',
        check_in_time: br.bookings?.check_in_time ?? null,
        check_out_time: br.bookings?.check_out_time ?? null,
        status: br.bookings?.status ?? '',
        guest_name: br.bookings?.guest_name ?? '',
        allocated_room_number: br.room_number,
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

      // Case A: Same-day turnover — tamu baru check-in di hari tamu lama check-out
      // Sah HANYA jika tamu baru check-in setelah tamu lama check-out
      if (checkInStr === existingCheckOut) {
        if (checkInTime < existingCheckOutTime) {
          return {
            hasConflict: true,
            conflictingBooking: existing,
            reason: `Tamu sebelumnya check-out jam ${existingCheckOutTime.slice(0, 5)}. Check-in baru harus setelah jam tersebut.`
          };
        }
        continue; // turnover sah → lanjut booking berikutnya
      }

      // Case B: Same-day turnover — tamu baru check-out di hari tamu berikut check-in
      // Sah HANYA jika tamu baru check-out sebelum tamu berikut check-in
      if (checkOutStr === existingCheckIn) {
        if (checkOutTime > existingCheckInTime) {
          return {
            hasConflict: true,
            conflictingBooking: existing,
            reason: `Tamu berikutnya check-in jam ${existingCheckInTime.slice(0, 5)}. Check-out harus sebelum jam tersebut.`
          };
        }
        continue; // turnover sah
      }

      // Case 1: Same check-in date - conflict if new check-in time < existing check-out time
      if (checkInStr === existingCheckIn) {
        if (checkInTime < existingCheckOutTime) {
          return { 
            hasConflict: true, 
            conflictingBooking: existing,
            reason: `Kamar belum tersedia. Check-out tamu sebelumnya jam ${existingCheckOutTime.slice(0, 5)}`
          };
        }
        continue; // time fit → skip Case 3 fallthrough
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
        continue; // time fit → skip Case 3 fallthrough
      }

      // Case 3: TRUE date overlap (strict — ujung yang bersentuhan sudah ditangani Case A/B)
      if (
        (checkInStr > existingCheckIn && checkInStr < existingCheckOut) ||
        (checkOutStr > existingCheckIn && checkOutStr < existingCheckOut) ||
        (checkInStr < existingCheckIn && checkOutStr > existingCheckOut) ||
        (checkInStr === existingCheckIn && checkOutStr === existingCheckOut)
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
          room.room_numbers?.forEach(rn => unavailableRoomNumbers.add(rn));
        } else {
          unavailableRoomNumbers.add(bd.room_number);
        }
      });
    }

    // Query overlapping bookings from direct allocations (STRICT overlap)
    const { data: directBookings, error: directError } = await supabase
      .from("bookings")
      .select("id, allocated_room_number")
      .eq("room_id", roomId)
      .not("status", "in", '("cancelled","rejected","no_show")')
      .lt("check_in", checkOutStr)
      .gt("check_out", checkInStr);

    if (directError) {
      console.error("Error checking room type availability:", directError);
    } else {
      (directBookings || []).forEach((b: { id: string; allocated_room_number: string | null }) => {
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
      // Filter booking_rooms for overlapping dates (STRICT)
      (bookingRoomsData as Array<{ room_number: string; booking_id: string; bookings: { id: string; check_in: string; check_out: string; status: string } | null }> || []).forEach((br) => {
        const booking = br.bookings;
        if (!booking) return;
        if (["cancelled", "rejected", "no_show"].includes(booking.status)) return;
        if (excludeBookingId && booking.id === excludeBookingId) return;
        if (booking.check_in < checkOutStr && booking.check_out > checkInStr) {
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
