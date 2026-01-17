import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { UpdateBookingParams } from '../lib/types.ts';
import { parseBookingCode, comparePhones, validateBookingVerification } from '../lib/validation.ts';
import { validateAndFixDate, formatDateIndonesian, calculateNights } from '../lib/dateUtils.ts';
import { checkRoomAllotmentAvailability } from '../services/availabilityService.ts';
import { sendBookingNotifications } from '../services/whatsappService.ts';

/**
 * Update an existing booking
 */
export async function handleUpdateBooking(
  supabase: SupabaseClient,
  params: UpdateBookingParams
) {
  const { booking_id, guest_phone, guest_email, new_num_guests, new_special_requests } = params;
  let { new_check_in, new_check_out } = params;

  // Validate required fields
  const validation = validateBookingVerification(booking_id, guest_phone, guest_email);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Parse and validate booking code
  const parsed = parseBookingCode(booking_id);
  if (!parsed.valid || !parsed.normalized) {
    throw new Error(parsed.error);
  }

  console.log(`Original booking_id: "${booking_id}" -> Sanitized: "${parsed.normalized}"`);

  // 1. Verify booking by booking_code with 3 factors
  const { data: existingBooking, error: findError } = await supabase
    .from("bookings")
    .select("id, booking_code, guest_name, guest_email, guest_phone, room_id, check_in, check_out, num_guests, status, total_price")
    .eq("booking_code", parsed.normalized)
    .ilike("guest_email", guest_email)
    .single();

  if (findError || !existingBooking) {
    throw new Error(`Booking dengan kode ${parsed.normalized} tidak ditemukan. Pastikan kode booking benar (format: PMH-XXXXXX) dan email sesuai dengan data booking.`);
  }

  // Verify phone number
  if (!comparePhones(guest_phone, existingBooking.guest_phone || '')) {
    throw new Error("Nomor telepon tidak cocok dengan data booking.");
  }

  // 2. Check if booking can be modified (NOT cancelled)
  if (existingBooking.status === 'cancelled') {
    throw new Error("Booking yang sudah dibatalkan tidak dapat diubah. Silakan buat booking baru.");
  }

  // 3. Prepare update data
  const updateData: any = { updated_at: new Date().toISOString() };

  // 4. If date changes, CHECK ROOM AVAILABILITY
  if (new_check_in || new_check_out) {
    const finalCheckIn = new_check_in 
      ? validateAndFixDate(new_check_in, "new_check_in").date 
      : existingBooking.check_in;
    const finalCheckOut = new_check_out 
      ? validateAndFixDate(new_check_out, "new_check_out").date 
      : existingBooking.check_out;

    // Get room info
    const { data: room } = await supabase
      .from("rooms")
      .select("id, name, allotment, price_per_night")
      .eq("id", existingBooking.room_id)
      .single();

    if (!room) throw new Error("Data kamar tidak ditemukan");

    // Check availability using unified service
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

    // Calculate new price
    const total_nights = calculateNights(finalCheckIn, finalCheckOut);
    
    updateData.check_in = finalCheckIn;
    updateData.check_out = finalCheckOut;
    updateData.total_nights = total_nights;
    updateData.total_price = total_nights * room.price_per_night;
    updateData.allocated_room_number = null; // Reset allocation
    
    updateData.check_in = new_check_in;
    updateData.check_out = new_check_out;
    updateData.total_nights = total_nights;
    updateData.total_price = total_nights * room.price_per_night;
    updateData.allocated_room_number = null; // Reset allocation
  }

  // 5. Update other fields
  if (new_num_guests) updateData.num_guests = new_num_guests;
  if (new_special_requests !== undefined) updateData.special_requests = new_special_requests;

  // 6. Save to database
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

  // 7. Send WhatsApp notifications
  const { data: hotelSettings } = await supabase
    .from("hotel_settings")
    .select("whatsapp_number, hotel_name")
    .single();

  sendBookingNotifications(hotelSettings, {
    guestName: updatedBooking.guest_name,
    guestEmail: updatedBooking.guest_email,
    guestPhone: updatedBooking.guest_phone,
    roomsText: (updatedBooking.rooms as any)?.name || '',
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
    room_name: (updatedBooking.rooms as any)?.name,
    check_in: formatDateIndonesian(updatedBooking.check_in),
    check_out: formatDateIndonesian(updatedBooking.check_out),
    num_guests: updatedBooking.num_guests,
    total_nights: updatedBooking.total_nights,
    total_price: updatedBooking.total_price,
    special_requests: updatedBooking.special_requests,
    status: updatedBooking.status
  };
}
