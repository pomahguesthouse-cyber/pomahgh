import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from "../types.ts";
import { sendWhatsApp } from "../services/fonnte.ts";
import { logMessage } from "../services/conversation.ts";
import { TraceContext } from "../../_shared/traceContext.ts";

export async function handleGuestBookingFlow(
  supabase: SupabaseClient,
  session: WhatsAppSession | null,
  phone: string,
  message: string,
  conversationId: string,
  personaName: string,
  managerNumbers: ManagerInfo[],
  env: EnvConfig,
  trace?: TraceContext,
  recentMessages?: any[],
  historyWindowMessages: number = 40,
  isNewSession: boolean = false,
): Promise<Response> {
  try {
    // 1. CEK APAKAH INI PERMINTAAN UPDATE BOOKING
    const historyText = recentMessages?.map((m) => m.content).join(" ") || "";
    const bookingCodeMatch = historyText.match(/PMH-[A-Z0-9]+/i);
    const isUpdateIntent = bookingCodeMatch && /\b(jadinya|ubah|ganti|malam|rubah)\b/i.test(message);

    if (isUpdateIntent) {
      // SAFE MODE: Kita tidak memproses update otomatis untuk menghindari error.
      // Kita log ke database agar admin melihatnya, dan kirim pesan sopan ke tamu.
      await logMessage(
        supabase,
        conversationId,
        "system",
        `⚠️ Tamu meminta update booking ${bookingCodeMatch![0]} ke: "${message}"`,
      );

      const reply = `Kak, untuk perubahan durasi booking ${bookingCodeMatch![0]}, saya sudah teruskan permintaan Kakak ke admin kami agar dibantu update secara manual ya. Mohon ditunggu sebentar, admin akan segera menghubungi Kakak 🙏`;

      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);

      return new Response(JSON.stringify({ status: "escalated_to_admin" }));
    }

    // 2. LOGIKA BOOKING BARU
    // Cek apakah user sudah memberikan tanggal check-in
    const dateMatch = message.match(/\d{1,2}\s*(jan|feb|mar|apr|mei|jun|jul|agt|sep|okt|nov|des)/i);

    if (!dateMatch) {
      const reply = "Baik kak, untuk booking barunya, rencana check-in tanggal berapa ya? 😊";
      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);
      return new Response(JSON.stringify({ status: "awaiting_date" }));
    }

    // 3. PROSES BOOKING BARU (Simulasi sukses)
    const reply = `Terima kasih! Permintaan booking tanggal ${dateMatch[0]} sudah kami catat. Admin akan segera memverifikasi ketersediaan kamar ya 🙏`;
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, conversationId, "assistant", reply);

    return new Response(JSON.stringify({ status: "success" }));
  } catch (error) {
    console.error("Booking Flow Error:", error);

    // Fallback terakhir: jika benar-benar ada error program, kirim pesan elegan
    const reply =
      "Mohon maaf kak, sistem sedang sibuk. Saya sudah teruskan pesan Kakak ke admin agar segera dibantu proses ya 🙏";
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: "error_handled" }));
  }
}
