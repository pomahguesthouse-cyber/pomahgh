import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CheckAvailabilityParams } from '../lib/types.ts';
import { validateAndFixDate, formatDateIndonesian } from '../lib/dateUtils.ts';

/**
 * Check room availability for given dates
 */
export async function handleCheckAvailability(
  supabase: SupabaseClient,
  params: CheckAvailabilityParams
) {
  // Validate and fix dates if needed
  const checkInResult = validateAndFixDate(params.check_in, "check_in");
  const checkOutResult = validateAndFixDate(params.check_out, "check_out");
  
  const check_in = checkInResult.date;
  const check_out = checkOutResult.date;
  const num_guests = params.num_guests;
  
  console.log(`✅ Checking availability: ${check_in} to ${check_out} for ${num_guests || 'any'} guests`);
  
  // Get all rooms with room_numbers
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, allotment, room_numbers, price_per_night, max_guests, description")
    .eq("available", true);

  if (roomsError) throw roomsError;

  // Fetch extra bed add-ons for capacity info
  const { data: extraBedAddons } = await supabase
    .from("room_addons")
    .select("room_id, extra_capacity, max_quantity")
    .eq("is_active", true)
    .ilike("name", "%extra bed%");

  // Get blocked dates from room_unavailable_dates
  const { data: unavailableDates } = await supabase
    .from("room_unavailable_dates")
    .select("room_id, room_number, unavailable_date")
    .gte("unavailable_date", check_in)
    .lt("unavailable_date", check_out);

  // Get booking_rooms entries for multi-room bookings
  const { data: bookingRoomsData } = await supabase
    .from("booking_rooms")
    .select("room_id, room_number, booking:bookings!inner(check_in, check_out, status)")
    .not("booking.status", "in", '("cancelled","rejected")');

  // Get direct bookings
  const { data: directBookings } = await supabase
    .from("bookings")
    .select("room_id, allocated_room_number, check_in, check_out")
    .not("status", "in", '("cancelled","rejected")')
    .lt("check_in", check_out)
    .gt("check_out", check_in);

  // Calculate available rooms using Set to track unavailable room numbers
  const availableRooms = (rooms || []).map(room => {
    const roomNumbers: string[] = room.room_numbers || [];
    const totalUnits = roomNumbers.length || room.allotment || 0;
    const unavailableRoomNumbers = new Set<string>();

    // Check blocked dates per room_number
    (unavailableDates || []).forEach(ud => {
      if (ud.room_id === room.id) {
        if (!ud.room_number) {
          // If no specific room_number, block all rooms of this type
          roomNumbers.forEach(rn => unavailableRoomNumbers.add(rn));
        } else {
          unavailableRoomNumbers.add(ud.room_number);
        }
      }
    });

    // Check booking_rooms (multi-room bookings)
    (bookingRoomsData || []).forEach((br: any) => {
      if (br.room_id === room.id && br.room_number) {
        const booking = br.booking;
        if (booking && 
            booking.check_in < check_out && 
            booking.check_out > check_in) {
          unavailableRoomNumbers.add(br.room_number);
        }
      }
    });

    // Check direct bookings
    (directBookings || []).forEach(b => {
      if (b.room_id === room.id && b.allocated_room_number) {
        unavailableRoomNumbers.add(b.allocated_room_number);
      }
    });

    const availableCount = Math.max(0, totalUnits - unavailableRoomNumbers.size);
    
    // Calculate extra bed capacity
    const extraBed = (extraBedAddons || []).find(a => 
      a.room_id === room.id || a.room_id === null
    );
    const maxExtraBeds = extraBed?.max_quantity || 0;
    const extraCapacity = extraBed ? (extraBed.extra_capacity || 1) * maxExtraBeds : 0;
    const maxGuestsWithExtraBed = room.max_guests + extraCapacity;
    
    return {
      name: room.name,
      available_count: availableCount,
      status: availableCount > 0 ? 'tersedia' : 'HABIS',
      price_per_night: room.price_per_night,
      max_guests: room.max_guests,
      max_extra_beds: maxExtraBeds,
      max_guests_with_extra_bed: maxGuestsWithExtraBed,
      description: room.description,
      suitable: num_guests ? num_guests <= maxGuestsWithExtraBed : true
    };
  });
  
  // Separate available and sold out rooms for clearer AI response
  const availableRoomsList = availableRooms.filter(r => r.available_count > 0);
  const soldOutRooms = availableRooms.filter(r => r.available_count === 0);

  return {
    check_in: formatDateIndonesian(check_in),
    check_out: formatDateIndonesian(check_out),
    check_in_raw: check_in,
    check_out_raw: check_out,
    available_rooms: availableRoomsList,
    sold_out_rooms: soldOutRooms.map(r => r.name),
    message: soldOutRooms.length > 0 
      ? `Kamar yang HABIS untuk tanggal ini: ${soldOutRooms.map(r => r.name).join(', ')}`
      : null
  };
}
