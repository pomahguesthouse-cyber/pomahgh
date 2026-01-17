import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AvailabilityQuery, AvailabilityResult } from '../lib/types.ts';

/**
 * SINGLE SOURCE OF TRUTH for room availability checks
 * Used by: check_availability, create_booking_draft, update_booking
 */
export async function getAvailableRoomNumbers(
  supabase: SupabaseClient,
  query: AvailabilityQuery
): Promise<AvailabilityResult> {
  const { roomId, roomNumbers, checkIn, checkOut, excludeBookingId } = query;
  const unavailable = new Set<string>();

  // 1. Check blocked dates from room_unavailable_dates
  const { data: blockedDates } = await supabase
    .from("room_unavailable_dates")
    .select("room_number, unavailable_date")
    .eq("room_id", roomId)
    .gte("unavailable_date", checkIn)
    .lt("unavailable_date", checkOut);

  (blockedDates || []).forEach(bd => {
    if (!bd.room_number) {
      // If no specific room_number, block all rooms of this type
      roomNumbers.forEach(rn => unavailable.add(rn));
    } else {
      unavailable.add(bd.room_number);
    }
  });

  // 2. Check booking_rooms entries (multi-room bookings)
  const { data: bookingRooms } = await supabase
    .from("booking_rooms")
    .select("room_number, booking:bookings!inner(id, check_in, check_out, status)")
    .eq("room_id", roomId)
    .not("booking.status", "in", '("cancelled","rejected")');

  (bookingRooms || []).forEach((br: any) => {
    if (br.room_number && br.booking) {
      // Exclude current booking if updating
      if (excludeBookingId && br.booking.id === excludeBookingId) return;
      
      // Check for date overlap
      if (br.booking.check_in < checkOut && br.booking.check_out > checkIn) {
        unavailable.add(br.room_number);
      }
    }
  });

  // 3. Check direct bookings (allocated_room_number)
  let directQuery = supabase
    .from("bookings")
    .select("id, allocated_room_number")
    .eq("room_id", roomId)
    .not("status", "in", '("cancelled","rejected")')
    .lt("check_in", checkOut)
    .gt("check_out", checkIn);

  if (excludeBookingId) {
    directQuery = directQuery.neq("id", excludeBookingId);
  }

  const { data: directBookings } = await directQuery;

  (directBookings || []).forEach(b => {
    if (b.allocated_room_number) {
      unavailable.add(b.allocated_room_number);
    }
  });

  // Calculate available room numbers
  const available = roomNumbers.filter(n => !unavailable.has(n));

  console.log(`📊 Availability for ${roomId}: ${available.length}/${roomNumbers.length} available`);

  return { available, unavailable };
}

/**
 * Check room availability (allotment-based check for update_booking)
 */
export async function checkRoomAllotmentAvailability(
  supabase: SupabaseClient,
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId: string
): Promise<{ available: boolean; bookedCount: number; allotment: number }> {
  // Get room info
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, allotment")
    .eq("id", roomId)
    .single();

  if (!room) {
    return { available: false, bookedCount: 0, allotment: 0 };
  }

  // Check unavailable dates
  const { data: unavailableDates } = await supabase
    .from("room_unavailable_dates")
    .select("unavailable_date")
    .eq("room_id", roomId)
    .gte("unavailable_date", checkIn)
    .lt("unavailable_date", checkOut);

  if (unavailableDates && unavailableDates.length > 0) {
    return { available: false, bookedCount: room.allotment, allotment: room.allotment };
  }

  // Check overlapping bookings (exclude current booking)
  const { data: overlappingBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("room_id", roomId)
    .neq("id", excludeBookingId)
    .neq("status", "cancelled")
    .lt("check_in", checkOut)
    .gt("check_out", checkIn);

  const bookedCount = overlappingBookings?.length || 0;
  const availableCount = room.allotment - bookedCount;

  return {
    available: availableCount > 0,
    bookedCount,
    allotment: room.allotment
  };
}
