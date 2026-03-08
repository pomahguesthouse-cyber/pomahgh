import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GetPaymentMethodsParams } from '../lib/types.ts';

// DOKU static payment methods
const DOKU_PAYMENT_METHODS = [
  { code: "VIRTUAL_ACCOUNT_BCA", name: "BCA Virtual Account", category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BANK_MANDIRI", name: "Mandiri Virtual Account", category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BRI", name: "BRI Virtual Account", category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BNI", name: "BNI Virtual Account", category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_PERMATA", name: "Permata Virtual Account", category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI", name: "BSI Virtual Account", category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_DOKU", name: "DOKU Virtual Account", category: "Virtual Account" },
  { code: "QRIS", name: "QRIS", category: "QRIS" },
  { code: "EMONEY_OVO", name: "OVO", category: "E-Wallet" },
  { code: "EMONEY_DANA", name: "DANA", category: "E-Wallet" },
  { code: "EMONEY_SHOPEEPAY", name: "ShopeePay", category: "E-Wallet" },
  { code: "EMONEY_LINKAJA", name: "LinkAja", category: "E-Wallet" },
];

export async function handleGetPaymentMethods(
  supabase: SupabaseClient,
  params: GetPaymentMethodsParams
) {
  const { booking_id, guest_phone, guest_email } = params;

  if (!booking_id || !guest_phone || !guest_email) {
    throw new Error("Kode booking, nomor telepon, dan email wajib diisi untuk melihat metode pembayaran");
  }

  const normalizedCode = booking_id.toUpperCase().replace(/\s+/g, '');

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, booking_code, total_price, status, payment_status, guest_name")
    .or(`booking_code.eq.${normalizedCode},id.eq.${normalizedCode}`)
    .eq("guest_phone", guest_phone)
    .eq("guest_email", guest_email)
    .maybeSingle();

  if (bookingError) {
    console.error("Booking lookup error:", bookingError);
    throw new Error("Gagal mencari data booking");
  }

  if (!booking) {
    throw new Error("Booking tidak ditemukan. Pastikan kode booking, nomor telepon, dan email sudah benar.");
  }

  if (booking.status === 'cancelled') {
    throw new Error("Booking ini sudah dibatalkan.");
  }

  if (booking.payment_status === 'paid') {
    return {
      message: `Booking ${booking.booking_code} sudah dibayar. Tidak perlu melakukan pembayaran lagi.`,
      already_paid: true,
      booking_code: booking.booking_code,
    };
  }

  const amount = Math.round(booking.total_price);

  // Group DOKU methods by category
  const grouped: Record<string, string[]> = {};
  for (const m of DOKU_PAYMENT_METHODS) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m.name);
  }

  const summaryParts: string[] = [];
  for (const [type, names] of Object.entries(grouped)) {
    summaryParts.push(`${type}: ${names.join(', ')}`);
  }

  return {
    message: `Untuk pembayaran booking ${booking.booking_code} (Rp ${amount.toLocaleString('id-ID')}), tim kami akan menghubungi Anda melalui WhatsApp dengan instruksi pembayaran. Mohon ditunggu sebentar ya! 🙏`,
    booking_code: booking.booking_code,
    booking_id: booking.id,
    total_price: amount,
    methods_summary: summaryParts,
    methods_count: DOKU_PAYMENT_METHODS.length,
    already_paid: false,
  };
}
