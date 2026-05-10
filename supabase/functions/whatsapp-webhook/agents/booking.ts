// agents/booking.ts
import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from "../types.ts";
import { sendWhatsApp } from "../services/fonnte.ts";
import { logMessage } from "../services/conversation.ts";

export async function handleGuestBookingFlow(
  supabase: SupabaseClient,
  session: any,
  phone: string,
  message: string,
  conversationId: string,
  personaName: string,
  managerNumbers: ManagerInfo[],
  env: EnvConfig,
  trace: any,
  recentMessages: any[],
): Promise<Response> {
  try {
    // 1. Deteksi apakah user mencoba mengubah booking yang sudah ada
    const historyText = recentMessages?.map((m) => m.content).join(" ") || "";
    const bookingCodeMatch = historyText.match(/PMH-[A-Z0-9]+/i);
    const isUpdate = bookingCodeMatch && /\b(jadinya|ubah|ganti|malam|rubah)\b/i.test(message);

    if (isUpdate) {
      // SAFE MODE: Jangan proses database, langsung eskalasi ke admin
      await logMessage(
        supabase,
        conversationId,
        "system",
        `⚠️ Tamu minta update booking ${bookingCodeMatch![0]}: "${message}"`,
      );

      const reply = `Kak, permintaan perubahan untuk booking ${bookingCodeMatch![0]} sudah saya teruskan ke admin kami ya agar dibantu proses secara manual. Mohon ditunggu sebentar, admin akan segera menghubungi Kakak 🙏`;

      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);
      return new Response(JSON.stringify({ status: "escalated_to_admin" }));
    }

    // 2. LOGIKA BOOKING BARU
    const dateMatch = message.match(/\d{1,2}\s*(jan|feb|mar|apr|mei|jun|jul|agt|sep|okt|nov|des)/i);
    if (!dateMatch) {
      const reply = "Baik kak, untuk booking barunya, rencana check-in tanggal berapa ya? 😊";
      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);
      return new Response(JSON.stringify({ status: "awaiting_date" }));
    }

    // Proses booking baru...
    return new Response(JSON.stringify({ status: "success" }));
  } catch (err) {
    console.error("Booking Flow Error:", err);
    return new Response(JSON.stringify({ status: "error_handled" }));
  }
}
