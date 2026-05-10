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
  // 1. CEK APAKAH INI UPDATE (Mendeteksi kode booking PMH-...)
  const historyText = recentMessages?.map((m) => m.content).join(" ") || "";
  const isUpdate = /PMH-[A-Z0-9]+/i.test(historyText) && /\b(jadinya|ubah|ganti|malam|rubah)\b/i.test(message);

  if (isUpdate) {
    // KODE INI MENGHENTIKAN LOOP ERROR
    // Bot tidak akan mencoba update database, langsung lapor admin
    const reply =
      "Kak, permintaan perubahan durasi booking sudah saya teruskan ke admin agar dibantu update secara manual ya. Mohon ditunggu sebentar, admin akan segera menghubungi Kakak 🙏";

    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, conversationId, "assistant", reply);
    await logMessage(supabase, conversationId, "system", `⚠️ Tamu meminta update: ${message}`);

    return new Response(JSON.stringify({ status: "escalated_to_admin" }));
  }

  // 2. LOGIKA BOOKING BARU (Jika tidak update)
  const reply = "Baik kak, saya sudah mengerti. Admin akan segera membantu proses bookingnya ya 🙏";
  await sendWhatsApp(phone, reply, env.fonnteApiKey);
  await logMessage(supabase, conversationId, "assistant", reply);

  return new Response(JSON.stringify({ status: "success" }));
}
