import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GetBookingParams } from '../lib/types.ts';
import { parseBookingCode, comparePhones, validateBookingVerification } from '../lib/validation.ts';
import { formatDateIndonesian } from '../lib/dateUtils.ts';

/**
 * Check payment status for a booking
 */
export async function handleCheckPaymentStatus(
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
      check_in, check_out, total_price, payment_status, payment_amount,
      status, rooms:room_id (name)
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

  // Calculate remaining amount
  const totalPrice = Number(booking.total_price) || 0;
  const paymentAmount = Number(booking.payment_amount) || 0;
  const remainingAmount = totalPrice - paymentAmount;

  // Determine status message
  let statusMessage = '';
  let isPaid = false;
  
  switch (booking.payment_status) {
    case 'paid':
      statusMessage = '✅ LUNAS - Pembayaran sudah diterima seluruhnya';
      isPaid = true;
      break;
    case 'partial':
      statusMessage = '⏳ BAYAR SEBAGIAN - Masih ada sisa yang harus dibayar';
      break;
    case 'unpaid':
    default:
      statusMessage = '❌ BELUM BAYAR - Belum ada pembayaran yang diterima';
      break;
  }

  // Get bank accounts if payment is not complete
  let bankAccounts: Array<{ bank_name: string; account_number: string; account_holder_name: string }> = [];
  if (!isPaid) {
    const { data: banks } = await supabase
      .from("bank_accounts")
      .select("bank_name, account_number, account_holder_name")
      .eq("is_active", true)
      .order("display_order");
    
    bankAccounts = banks || [];
  }

  return {
    booking_code: booking.booking_code,
    guest_name: booking.guest_name,
    room_name: (booking.rooms as any)?.name,
    check_in: formatDateIndonesian(booking.check_in),
    check_out: formatDateIndonesian(booking.check_out),
    booking_status: booking.status,
    payment_status: booking.payment_status,
    payment_status_message: statusMessage,
    total_price: totalPrice,
    payment_amount: paymentAmount,
    remaining_amount: remainingAmount,
    is_fully_paid: isPaid,
    bank_accounts: bankAccounts,
    note: isPaid 
      ? "Terima kasih! Pembayaran Anda sudah kami terima." 
      : `Silakan transfer sisa pembayaran Rp ${remainingAmount.toLocaleString('id-ID')} ke salah satu rekening bank kami.`
  };
}
