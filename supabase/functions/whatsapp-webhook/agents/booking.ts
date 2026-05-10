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
): Promise<Response> {
  try {
    // 1. DETEKSI UPDATE BOOKING (Cek kode PMH- di riwayat)
    const historyText = recentMessages?.map((m) => m.content).join(" ") || "";
    const bookingCodeMatch = historyText.match(/PMH-[A-Z0-9]+/i);
    const isUpdateIntent = bookingCodeMatch && /\b(jadinya|ubah|ganti|malam|rubah|menjadi)\b/i.test(message);

    if (isUpdateIntent) {
      await logMessage(
        supabase,
        conversationId,
        "system",
        `⚠️ Tamu minta update booking ${bookingCodeMatch![0]}: "${message}"`,
      );
      const reply = `Kak, permintaan perubahan untuk booking ${bookingCodeMatch![0]} sudah saya teruskan ke admin kami ya agar dibantu proses secara manual. Mohon ditunggu sebentar 🙏`;
      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);
      return new Response(JSON.stringify({ status: "escalated_to_admin" }));
    }

    // 2. LOGIKA BOOKING BARU
    return await handleNewBooking(supabase, phone, conversationId, message, env);
  } catch (error) {
    console.error("Booking Flow Error:", error);
    // Fallback: tidak mengirim pesan error teknis, tapi menyapa balik dengan sopan
    const reply = "Baik kak, silakan infokan tanggal check-in yang diinginkan agar bisa segera saya proses ya 🙏";
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: "error_handled" }));
  }
}

async function handleNewBooking(supabase: SupabaseClient, phone: string, convId: string, msg: string, env: EnvConfig) {
  const normalized = msg.toLowerCase();
  const today = new Date();
  let targetDate = null;

  // Parsing tanggal (Hari ini / Besok / Tanggal spesifik)
  if (normalized.includes("hari ini")) {
    targetDate = today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } else if (normalized.includes("besok")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    targetDate = tomorrow.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } else {
    // Cari pattern "10 mei" atau "10-05"
    const dateMatch = msg.match(/(\d{1,2})\s*(jan|feb|mar|apr|mei|jun|jul|agt|sep|okt|nov|des)/i);
    if (dateMatch) {
      targetDate = `${dateMatch[1]} ${dateMatch[2]} ${today.getFullYear()}`;
    }
  }

  // Jika tanggal belum ditemukan
  if (!targetDate) {
    const reply =
      "Baik kak, untuk booking-nya, rencana check-in tanggal berapa ya? (Bisa tulis tanggal misal: 10 Mei, atau 'hari ini') 😊";
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, convId, "assistant", reply);
    return new Response(JSON.stringify({ status: "awaiting_date" }));
  }

  // Jika tanggal ditemukan
  const reply = `Siap kak, untuk booking tanggal ${targetDate}, mohon tunggu sebentar saya cek ketersediaan kamarnya ya... 🙏`;
  await sendWhatsApp(phone, reply, env.fonnteApiKey);
  await logMessage(supabase, convId, "assistant", reply);

  return new Response(JSON.stringify({ status: "success" }));
}
