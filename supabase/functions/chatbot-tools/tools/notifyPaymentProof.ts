import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PaymentProofParams {
  booking_code?: string;
  guest_name?: string;
  guest_phone?: string;
  payment_details?: string;
}

/**
 * Notify ALL managers via WhatsApp when a guest sends payment proof.
 */
export async function handleNotifyPaymentProof(
  supabase: SupabaseClient,
  params: PaymentProofParams
) {
  const FONNTE_API_KEY = Deno.env.get("FONNTE_API_KEY");
  if (!FONNTE_API_KEY) {
    return { success: false, error: "WhatsApp notification not configured" };
  }

  const { data: settings } = await supabase
    .from("hotel_settings")
    .select("whatsapp_manager_numbers, hotel_name")
    .single();

  const managers: Array<{ phone: string; name: string; role?: string }> =
    settings?.whatsapp_manager_numbers || [];

  if (managers.length === 0) {
    return { success: false, error: "No manager numbers configured" };
  }

  const hotelName = settings?.hotel_name || "Hotel";

  const notifMessage = `💰 *PEMBAYARAN MASUK*

📍 ${hotelName}
👤 Tamu: ${params.guest_name || "Tidak diketahui"}
📱 HP: ${params.guest_phone || "-"}
📝 Kode Booking: ${params.booking_code || "-"}
💬 Detail: ${params.payment_details || "Tamu mengirimkan bukti pembayaran"}

⏰ ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}

_Segera cek dan konfirmasi pembayaran ini._`;

  const results: Array<{ phone: string; success: boolean }> = [];

  for (const manager of managers) {
    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: FONNTE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: manager.phone,
          message: notifMessage,
        }),
      });

      const result = await response.json();
      console.log(`Payment notification sent to ${manager.name} (${manager.phone}):`, JSON.stringify(result));
      results.push({ phone: manager.phone, success: !!result.status });
    } catch (err) {
      console.error(`Failed to notify ${manager.name}:`, err);
      results.push({ phone: manager.phone, success: false });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return {
    success: successCount > 0,
    notified_count: successCount,
    total_managers: managers.length,
    message: successCount > 0
      ? `Terima kasih! Bukti pembayaran Anda telah kami terima. Tim kami sedang mengecek pembayaran Anda, mohon ditunggu sebentar ya! 🙏`
      : "Gagal mengirim notifikasi ke pengelola.",
  };
}
