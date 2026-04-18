/**
 * Payment Approval Handler (Manager YA / TIDAK reply)
 *
 * Dipicu ketika manager membalas notifikasi bukti transfer dengan:
 *   - "YA" / "OK" / "LUNAS" / "APPROVE" → set booking ke paid + confirmed, kirim invoice
 *   - "TIDAK" / "NO" / "REJECT" → tolak, notifikasi tamu
 *
 * Konteks pembayaran tertua yang masih pending dari payment_proofs (status='pending')
 * akan diproses.
 */
import type { SupabaseClient, EnvConfig, ManagerInfo } from '../types.ts';
import { corsHeaders } from '../types.ts';
import { sendWhatsApp } from '../services/fonnte.ts';
import { sendBookingOrderToGuest } from '../services/sendBookingOrder.ts';

const APPROVE_RE = /^\s*(ya|iya|ok|oke|okey|lunas|approve|approved|setuju|konfirmasi|confirm)\s*$/i;
const REJECT_RE = /^\s*(tidak|no|reject|tolak|gagal|salah|mismatch)\s*$/i;

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export function isPaymentApprovalReply(message: string): 'approve' | 'reject' | null {
  if (APPROVE_RE.test(message)) return 'approve';
  if (REJECT_RE.test(message)) return 'reject';
  return null;
}

/**
 * Find the most recent pending payment_proof row that needs manager decision.
 * Returns null if no pending proof exists (e.g. already auto-approved).
 */
async function findPendingProof(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('payment_proofs')
    .select('id, booking_id, amount, sender_name, bank_name')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export async function handlePaymentApproval(
  supabase: SupabaseClient,
  managerPhone: string,
  decision: 'approve' | 'reject',
  managerInfo: ManagerInfo,
  managerNumbers: ManagerInfo[],
  env: EnvConfig,
): Promise<Response> {
  const proof = await findPendingProof(supabase);
  if (!proof) {
    await sendWhatsApp(
      managerPhone,
      'ℹ️ Tidak ada bukti transfer yang menunggu konfirmasi saat ini.',
      env.fonnteApiKey,
    );
    return new Response(JSON.stringify({ status: 'no_pending_proof' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Load booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, booking_code, guest_name, guest_phone, total_price')
    .eq('id', proof.booking_id)
    .maybeSingle();

  if (!booking) {
    await sendWhatsApp(managerPhone, '❌ Booking terkait tidak ditemukan.', env.fonnteApiKey);
    return new Response(JSON.stringify({ status: 'booking_not_found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (decision === 'approve') {
    // 1. Update booking → paid + confirmed
    await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        payment_amount: proof.amount ?? booking.total_price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    // 2. Update proof → approved
    await supabase
      .from('payment_proofs')
      .update({ status: 'approved', verified_at: new Date().toISOString() })
      .eq('id', proof.id);

    // 3. Kirim booking order (PDF invoice) ke WhatsApp tamu
    let orderResult = { success: false, whatsapp_sent: false };
    if (booking.guest_phone) {
      orderResult = await sendBookingOrderToGuest(booking.id, env) as any;
    }

    // 4. Reply ke manager
    await sendWhatsApp(
      managerPhone,
      `✅ *PEMBAYARAN DIKONFIRMASI*\n\n📋 ${booking.booking_code} — ${booking.guest_name}\n💰 ${formatRp(proof.amount ?? booking.total_price)}\n\nStatus booking: *LUNAS & CONFIRMED*\nBooking order ${orderResult.whatsapp_sent ? 'terkirim ke WhatsApp tamu ✅' : 'gagal terkirim ke tamu ⚠️ — kirim manual'}.`,
      env.fonnteApiKey,
    );

    // 5. Notif tamu (jika invoice tidak terkirim, tetap kirim teks konfirmasi)
    if (booking.guest_phone && !orderResult.whatsapp_sent) {
      await sendWhatsApp(
        booking.guest_phone,
        `🎉 Halo *${booking.guest_name}*!\n\nPembayaran Anda untuk booking *${booking.booking_code}* sudah *DIKONFIRMASI LUNAS* ✅\n\nTerima kasih, kami tunggu kedatangan Anda 🙏`,
        env.fonnteApiKey,
      );
    }

    return new Response(JSON.stringify({ status: 'approved', booking_id: booking.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // === REJECT ===
  await supabase
    .from('payment_proofs')
    .update({
      status: 'rejected',
      verified_at: new Date().toISOString(),
      notes: `Rejected by ${managerInfo.name || managerPhone}`,
    })
    .eq('id', proof.id);

  await sendWhatsApp(
    managerPhone,
    `❌ Bukti transfer untuk *${booking.booking_code}* ditandai *DITOLAK*. Tamu sudah dinotifikasi untuk mengirim ulang bukti.`,
    env.fonnteApiKey,
  );

  if (booking.guest_phone) {
    await sendWhatsApp(
      booking.guest_phone,
      `Halo *${booking.guest_name}* 🙏\n\nMohon maaf, bukti transfer untuk booking *${booking.booking_code}* belum bisa kami verifikasi. Mohon kirim ulang bukti transfer yang lebih jelas, atau hubungi admin untuk bantuan. Terima kasih 🙏`,
      env.fonnteApiKey,
    );
  }

  return new Response(JSON.stringify({ status: 'rejected', booking_id: booking.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
