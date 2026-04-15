import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parseBookingCode, comparePhones, validateBookingVerification } from '../lib/validation.ts';
import { formatDateIndonesian } from '../lib/dateUtils.ts';

interface CancelBookingParams {
  booking_id: string;
  guest_phone: string;
  guest_email: string;
  reason?: string;
}

export async function handleCancelBooking(
  supabase: SupabaseClient,
  params: CancelBookingParams
) {
  const { booking_id, guest_phone, guest_email, reason } = params;

  const validation = validateBookingVerification(booking_id, guest_phone, guest_email);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const parsed = parseBookingCode(booking_id);
  if (!parsed.valid || !parsed.normalized) {
    throw new Error(parsed.error);
  }

  const { data: booking, error: findError } = await supabase
    .from("bookings")
    .select("id, booking_code, guest_name, guest_email, guest_phone, check_in, check_out, status, room_id, total_price")
    .eq("booking_code", parsed.normalized)
    .ilike("guest_email", guest_email)
    .single();

  if (findError || !booking) {
    throw new Error(`Booking ${parsed.normalized} tidak ditemukan atau email tidak cocok.`);
  }

  if (!comparePhones(guest_phone, booking.guest_phone || '')) {
    throw new Error("Nomor telepon tidak cocok dengan data booking.");
  }

  if (booking.status === 'cancelled') {
    return { message: `Booking ${booking.booking_code} sudah dibatalkan sebelumnya.`, booking_code: booking.booking_code };
  }

  if (['checked_in', 'checked_out'].includes(booking.status)) {
    throw new Error(`Booking tidak bisa dibatalkan karena status sudah ${booking.status}.`);
  }

  const cancellationReason = reason || 'Dibatalkan oleh tamu melalui WhatsApp';

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: 'cancelled',
      payment_status: 'cancelled',
      cancellation_reason: cancellationReason,
      updated_at: new Date().toISOString()
    })
    .eq("id", booking.id);

  if (updateError) throw new Error(`Gagal membatalkan booking: ${updateError.message}`);

  // Get room name
  const { data: room } = await supabase
    .from("rooms")
    .select("name")
    .eq("id", booking.room_id)
    .single();

  return {
    message: "Booking berhasil dibatalkan.",
    booking_code: booking.booking_code,
    guest_name: booking.guest_name,
    room_name: room?.name || '',
    check_in: formatDateIndonesian(booking.check_in),
    check_out: formatDateIndonesian(booking.check_out),
    status: 'cancelled'
  };
}
