import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GetBookingParams } from '../lib/types.ts';
import { parseBookingCode, comparePhones, validateBookingVerification } from '../lib/validation.ts';
import { formatDateIndonesian } from '../lib/dateUtils.ts';

/**
 * Get booking details with verification
 */
export async function handleGetBookingDetails(
  supabase: SupabaseClient,
  params: GetBookingParams
) {
  const { booking_id, guest_phone, guest_email } = params;
  
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

  // Query booking by booking_code with email verification
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id, booking_code, guest_name, guest_email, guest_phone,
      check_in, check_out, check_in_time, check_out_time,
      num_guests, total_nights, total_price, status, payment_status,
      special_requests, allocated_room_number, created_at,
      rooms:room_id (name, price_per_night, max_guests)
    `)
    .eq("booking_code", parsed.normalized)
    .ilike("guest_email", guest_email)
    .single();

  if (error || !booking) {
    throw new Error(`Booking dengan kode ${parsed.normalized} tidak ditemukan. Pastikan kode booking benar (format: PMH-XXXXXX) dan email sesuai dengan data booking.`);
  }

  // Verify phone number
  if (!comparePhones(guest_phone, booking.guest_phone || '')) {
    throw new Error("Nomor telepon tidak cocok dengan data booking.");
  }

  return {
    booking_code: booking.booking_code,
    guest_name: booking.guest_name,
    guest_email: booking.guest_email,
    guest_phone: booking.guest_phone,
    room_name: (booking.rooms as any)?.name,
    check_in: formatDateIndonesian(booking.check_in),
    check_out: formatDateIndonesian(booking.check_out),
    check_in_time: booking.check_in_time,
    check_out_time: booking.check_out_time,
    num_guests: booking.num_guests,
    total_nights: booking.total_nights,
    total_price: booking.total_price,
    status: booking.status,
    payment_status: booking.payment_status,
    special_requests: booking.special_requests,
    allocated_room_number: booking.allocated_room_number,
    can_modify: booking.status !== 'cancelled'
  };
}
