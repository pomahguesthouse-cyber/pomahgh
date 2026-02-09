import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GetPaymentMethodsParams } from '../lib/types.ts';

// Helper to create MD5 hash for Duitku signature
async function md5(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer).catch(() => null);
  
  if (hashBuffer) {
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // Fallback: Use a simple MD5 implementation
  const { createHash } = await import("https://deno.land/std@0.177.0/node/crypto.ts");
  return createHash("md5").update(message).digest("hex");
}

/**
 * Get available payment methods for a booking
 */
export async function handleGetPaymentMethods(
  supabase: SupabaseClient,
  params: GetPaymentMethodsParams
) {
  const { booking_id, guest_phone, guest_email } = params;

  if (!booking_id || !guest_phone || !guest_email) {
    throw new Error("Kode booking, nomor telepon, dan email wajib diisi untuk melihat metode pembayaran");
  }

  // Normalize booking code
  const normalizedCode = booking_id.toUpperCase().replace(/\s+/g, '');

  // Verify booking ownership
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

  // Get Duitku credentials
  const merchantCode = Deno.env.get("DUITKU_MERCHANT_CODE");
  const apiKey = Deno.env.get("DUITKU_API_KEY");

  if (!merchantCode || !apiKey) {
    throw new Error("Konfigurasi payment gateway belum lengkap");
  }

  // Create signature for getpaymentmethod
  const datetime = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
  const signature = await md5(merchantCode + amount.toString() + datetime + apiKey);

  // Call Duitku API
  const response = await fetch("https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantcode: merchantCode,
      amount,
      datetime,
      signature,
    }),
  });

  if (!response.ok) {
    console.error("Duitku API error:", response.status);
    throw new Error("Gagal mengambil metode pembayaran");
  }

  const data = await response.json();

  if (data.responseCode !== "00") {
    console.error("Duitku response error:", data);
    throw new Error("Gagal mengambil metode pembayaran dari gateway");
  }

  // Format payment methods for chatbot
  const methods = (data.paymentFee || []).map((m: { paymentMethod: string; paymentName: string; paymentImage: string; totalFee: string }) => ({
    code: m.paymentMethod,
    name: m.paymentName,
    image: m.paymentImage,
    fee: parseInt(m.totalFee) || 0,
  }));

  // Group by type for cleaner display
  const grouped: Record<string, Array<{ name: string; code: string; fee: number }>> = {};
  for (const m of methods) {
    const type = m.name.includes('Virtual Account') || m.code.startsWith('B') ? 'Virtual Account' :
                 m.code === 'SP' || m.name.includes('QRIS') ? 'QRIS' :
                 m.name.includes('OVO') || m.name.includes('Dana') || m.name.includes('ShopeePay') || m.name.includes('LinkAja') ? 'E-Wallet' :
                 'Lainnya';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({ name: m.name, code: m.code, fee: m.fee });
  }

  // Build text summary
  const summaryParts: string[] = [];
  for (const [type, items] of Object.entries(grouped)) {
    const names = items.map(i => i.name).join(', ');
    summaryParts.push(`${type}: ${names}`);
  }

  const paymentUrl = `https://pomahgh.lovable.app/payment/${booking.id}`;

  return {
    message: `Metode pembayaran tersedia untuk booking ${booking.booking_code} (Rp ${amount.toLocaleString('id-ID')}):\n\n${summaryParts.join('\n')}\n\nSilakan klik link berikut untuk melakukan pembayaran:\n${paymentUrl}`,
    booking_code: booking.booking_code,
    booking_id: booking.id,
    total_price: amount,
    payment_url: paymentUrl,
    methods_summary: summaryParts,
    methods_count: methods.length,
    already_paid: false,
  };
}