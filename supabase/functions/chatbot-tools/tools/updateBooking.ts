import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { UpdateBookingParams } from '../lib/types.ts';
import { parseBookingCode, comparePhones, validateBookingVerification } from '../lib/validation.ts';
import { validateAndFixDate, formatDateIndonesian, calculateNights } from '../lib/dateUtils.ts';
import { checkRoomAllotmentAvailability } from '../services/availabilityService.ts';
import { sendBookingNotifications } from '../services/whatsappService.ts';

export async function handleUpdateBooking(
  supabase: SupabaseClient,
  params: UpdateBookingParams
) {
  const { booking_id, guest_phone, guest_email, new_num_guests, new_special_requests } = params;
  let { new_check_in, new_check_out } = params;

  const validation = validateBookingVerification(booking_id, guest_phone, guest_email);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const parsed = parseBookingCode(booking_id);
  if (!parsed.valid || !parsed.normalized) {
    throw new Error(parsed.error);
  }

  console.log(`Original booking_id: "${booking_id}" -> Sanitized: "${parsed.normalized}"`);

  const { data: existingBooking, error: findError } = await supabase
    .from("bookings")
    .select("id, booking_code, guest_name, guest_email, guest_phone, room_id, check_in, check_out, num_guests, status, total_price")
    .eq("booking_code", parsed.normalized)
    .ilike("guest_email", guest_email)
    .single();

  if (findError || !existingBooking) {
    throw new Error(`Booking dengan kode ${parsed.normalized} tidak ditemukan. Pastikan kode booking benar (format: PMH-XXXXXX) dan email sesuai dengan data booking.`);
  }

  if (!comparePhones(guest_phone, existingBooking.guest_phone || '')) {
    throw new Error("Nomor telepon tidak cocok dengan data booking.");
  }

  if (existingBooking.status === 'cancelled') {
    throw new Error("Booking yang sudah dibatalkan tidak dapat diubah. Silakan buat booking baru.");
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (new_check_in || new_check_out) {
    const finalCheckIn = new_check_in 
      ? validateAndFixDate(new_check_in, "new_check_in").date 
      : existingBooking.check_in;
    const finalCheckOut = new_check_out 
      ? validateAndFixDate(new_check_out, "new_check_out").date 
      : existingBooking.check_out;

    const { data: room } = await supabase
      .from("rooms")
      .select("id, name, allotment, price_per_night")
      .eq("id", existingBooking.room_id)
      .single();

    if (!room) throw new Error("Data kamar tidak ditemukan");

    const availability = await checkRoomAllotmentAvailability(
      supabase,
      room.id,
      finalCheckIn,
      finalCheckOut,
      existingBooking.id
    );

    if (!availability.available) {
      throw new Error(`Maaf, kamar ${room.name} sudah penuh di tanggal tersebut. Silakan pilih tanggal lain.`);
    }

    const total_nights = calculateNights(finalCheckIn, finalCheckOut);
    
    updateData.check_in = finalCheckIn;
    updateData.check_out = finalCheckOut;
    updateData.total_nights = total_nights;
    updateData.total_price = total_nights * room.price_per_night;
    updateData.allocated_room_number = null;
  }

  if (new_num_guests) updateData.num_guests = new_num_guests;
  if (new_special_requests !== undefined) updateData.special_requests = new_special_requests;

  const { data: updatedBooking, error: updateError } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", existingBooking.id)
    .select(`
      id, booking_code, guest_name, guest_email, guest_phone,
      check_in, check_out, num_guests, total_nights, total_price,
      special_requests, status, payment_status,
      rooms:room_id (name)
    `)
    .single();

  if (updateError) throw new Error(`Gagal mengubah booking: ${updateError.message}`);

  // rooms from join is an array, extract first element
  const roomsData = updatedBooking.rooms as unknown;
  const roomName = Array.isArray(roomsData) 
    ? (roomsData[0] as { name: string } | undefined)?.name || ''
    : (roomsData as { name: string } | null)?.name || '';

  const { data: hotelSettings } = await supabase
    .from("hotel_settings")
    .select("whatsapp_number, hotel_name")
    .single();

  sendBookingNotifications(hotelSettings, {
    guestName: updatedBooking.guest_name,
    guestEmail: updatedBooking.guest_email,
    guestPhone: updatedBooking.guest_phone,
    roomsText: roomName,
    totalRooms: 1,
    checkIn: updatedBooking.check_in,
    checkOut: updatedBooking.check_out,
    numGuests: updatedBooking.num_guests,
    totalNights: updatedBooking.total_nights,
    totalPrice: updatedBooking.total_price,
    bookingCode: updatedBooking.booking_code,
    status: updatedBooking.status
  }, 'update');

  return {
    message: "Booking berhasil diubah!",
    booking_code: updatedBooking.booking_code,
    room_name: roomName,
    check_in: formatDateIndonesian(updatedBooking.check_in),
    check_out: formatDateIndonesian(updatedBooking.check_out),
    num_guests: updatedBooking.num_guests,
    total_nights: updatedBooking.total_nights,
    total_price: updatedBooking.total_price,
    special_requests: updatedBooking.special_requests,
    status: updatedBooking.status
  };
}
