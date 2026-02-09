import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CheckAvailabilityParams } from '../lib/types.ts';
import { validateAndFixDate, formatDateIndonesian } from '../lib/dateUtils.ts';

export async function handleCheckAvailability(
  supabase: SupabaseClient,
  params: CheckAvailabilityParams
) {
  const checkInResult = validateAndFixDate(params.check_in, "check_in");
  const checkOutResult = validateAndFixDate(params.check_out, "check_out");
  
  const check_in = checkInResult.date;
  const check_out = checkOutResult.date;
  const num_guests = params.num_guests;
  
  console.log(`✅ Checking availability: ${check_in} to ${check_out} for ${num_guests || 'any'} guests`);
  
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, allotment, room_numbers, price_per_night, max_guests, description")
    .eq("available", true);

  if (roomsError) throw roomsError;

  const { data: extraBedAddons } = await supabase
    .from("room_addons")
    .select("room_id, extra_capacity, max_quantity")
    .eq("is_active", true)
    .ilike("name", "%extra bed%");

  const { data: unavailableDates } = await supabase
    .from("room_unavailable_dates")
    .select("room_id, room_number, unavailable_date")
    .gte("unavailable_date", check_in)
    .lt("unavailable_date", check_out);

  const { data: bookingRoomsData } = await supabase
    .from("booking_rooms")
    .select("room_id, room_number, booking:bookings!inner(check_in, check_out, status)")
    .not("booking.status", "in", '("cancelled","rejected")');

  const { data: directBookings } = await supabase
    .from("bookings")
    .select("room_id, allocated_room_number, check_in, check_out")
    .not("status", "in", '("cancelled","rejected")')
    .lt("check_in", check_out)
    .gt("check_out", check_in);

  const availableRooms = (rooms || []).map(room => {
    const roomNumbers: string[] = (room.room_numbers as string[] | null) || [];
    const totalUnits = roomNumbers.length || room.allotment || 0;
    const unavailableRoomNumbers = new Set<string>();

    (unavailableDates || []).forEach((ud: { room_id: string; room_number: string | null }) => {
      if (ud.room_id === room.id) {
        if (!ud.room_number) {
          roomNumbers.forEach(rn => unavailableRoomNumbers.add(rn));
        } else {
          unavailableRoomNumbers.add(ud.room_number);
        }
      }
    });

    // Check booking_rooms (multi-room bookings) - booking is an array from join
    (bookingRoomsData || []).forEach((br: { room_id: string; room_number: string | null; booking: Array<{ check_in: string; check_out: string; status: string }> }) => {
      if (br.room_id === room.id && br.room_number) {
        const bookings = Array.isArray(br.booking) ? br.booking : [br.booking];
        for (const b of bookings) {
          if (b && b.check_in < check_out && b.check_out > check_in) {
            unavailableRoomNumbers.add(br.room_number);
            break;
          }
        }
      }
    });

    (directBookings || []).forEach((b: { room_id: string; allocated_room_number: string | null }) => {
      if (b.room_id === room.id && b.allocated_room_number) {
        unavailableRoomNumbers.add(b.allocated_room_number);
      }
    });

    const availableCount = Math.max(0, totalUnits - unavailableRoomNumbers.size);
    
    const extraBed = (extraBedAddons || []).find((a: { room_id: string | null }) => 
      a.room_id === room.id || a.room_id === null
    );
    const maxExtraBeds = (extraBed as { max_quantity?: number } | undefined)?.max_quantity || 0;
    const extraCapacity = extraBed ? ((extraBed as { extra_capacity?: number }).extra_capacity || 1) * maxExtraBeds : 0;
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
