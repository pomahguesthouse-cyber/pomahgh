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
  // 1. DETEKSI UPDATE BOOKING
  // Kita cek apakah riwayat pesan terakhir mengandung kode booking (PMH-...)
  const historyText = recentMessages?.map((m) => m.content).join(" ") || "";
  const bookingCodeMatch = historyText.match(/PMH-[A-Z0-9]+/i);
  const isUpdate = bookingCodeMatch && /\b(jadi|ubah|ganti|3\s*malam)\b/i.test(message);

  try {
    if (isUpdate) {
      return await handleUpdateBooking(supabase, phone, conversationId, bookingCodeMatch![0], message, env);
    }

    // 2. LOGIKA BOOKING BARU (Default)
    return await handleNewBooking(supabase, phone, conversationId, message, env);
  } catch (error) {
    console.error("Booking Flow Error:", error);
    // RESPONS ELEGAN SAAT ERROR
    const reply =
      "Mohon maaf kak, sedang ada kendala teknis. Saya teruskan pesan Kakak ke admin ya agar dibantu manual 🙏";
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: "escalated" }));
  }
}

// --- SUB-HANDLER: UPDATE BOOKING ---
async function handleUpdateBooking(
  supabase: SupabaseClient,
  phone: string,
  convId: string,
  code: string,
  msg: string,
  env: EnvConfig,
) {
  // Panggil fungsi database untuk update (pastikan fungsi ini ada di Supabase RPC Anda)
  const { error } = await supabase.rpc("update_booking_duration", {
    p_code: code,
    p_nights: msg.includes("3") ? 3 : 2, // Parsing sederhana
  });

  if (error) throw new Error("DB_UPDATE_FAILED");

  const reply = `Baik Kak, booking ${code} sudah saya update menjadi 3 malam. Mohon tunggu update rincian pembayarannya ya Kak 🙏`;
  await sendWhatsApp(phone, reply, env.fonnteApiKey);
  await logMessage(supabase, convId, "assistant", reply);
  return new Response(JSON.stringify({ status: "success" }));
}

// --- SUB-HANDLER: NEW BOOKING ---
async function handleNewBooking(supabase: SupabaseClient, phone: string, convId: string, msg: string, env: EnvConfig) {
  // Logic booking baru Anda...
  // Jika data kurang, jangan return error, return pesan minta info
  const dateMatch = msg.match(/\d{1,2}\s*(jan|feb|mar|apr|mei|jun|jul|agt|sep|okt|nov|des)/i);

  if (!dateMatch) {
    const reply = "Untuk booking-nya, rencana mau check-in tanggal berapa ya Kak? 😊";
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, convId, "assistant", reply);
    return new Response(JSON.stringify({ status: "awaiting_date" }));
  }

  // Jika data lengkap, proses insert ke DB...
  return new Response(JSON.stringify({ status: "success" }));
}
