import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from "../types.ts";
import { sendWhatsApp } from "../services/fonnte.ts";
import { logMessage } from "../services/conversation.ts";
import { TraceContext } from "../../_shared/traceContext.ts";

/**
 * PROSES BOOKING DENGAN TOOL CALLING
 * Menggunakan Supabase RPC untuk memastikan data konsisten.
 */

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
    // 1. Ekstrak detail booking menggunakan AI
    const bookingIntent = await extractBookingDetails(message);

    // 2. Validasi: Apakah user sudah memberikan tanggal?
    if (!bookingIntent.check_in_date) {
      const reply = `Kak, saya catat mau booking ${bookingIntent.nights} malam ya. Boleh bantu saya, rencana check-in tanggal berapa? 😊`;
      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);
      return new Response(JSON.stringify({ status: "awaiting_input" }));
    }

    // 3. Panggil Tool (Simulasi eksekusi ke Supabase)
    const result = await executeBookingInDB(supabase, {
      phone,
      check_in: bookingIntent.check_in_date,
      nights: bookingIntent.nights,
      notes: message,
    });

    // 4. Respon berdasarkan hasil database
    if (result.success) {
      const reply = `Terima kasih! Booking untuk ${bookingIntent.nights} malam per tanggal ${bookingIntent.check_in_date} sudah kami simpan. Admin akan segera memverifikasi ketersediaan kamar ya 🙏`;
      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);
    } else {
      throw new Error(result.error || "DB_INSERT_FAILED");
    }

    return new Response(JSON.stringify({ status: "success" }));
  } catch (error) {
    console.error("Booking Tool Execution Error:", error);
    // Jika gagal, berikan respon yang elegan
    const apology =
      "Mohon maaf kak, sistem booking kami sedang sibuk. Mohon tunggu 1 menit lagi ya, saya akan coba proses kembali atau hubungkan ke admin 🙏";
    await sendWhatsApp(phone, apology, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: "error" }), { status: 500 });
  }
}

/**
 * TOOL: Ekstraksi Data (Menggunakan LLM Internal)
 * Anda bisa mengganti ini dengan prompt LLM yang lebih kompleks
 */
async function extractBookingDetails(message: string) {
  // Sederhana: mencari pattern angka dan tanggal
  const nightsMatch = message.match(/(\d+)\s*malam/i);
  const dateMatch = message.match(/(\d{1,2}\s*(jan|feb|mar|apr|mei|jun|jul|agt|sep|okt|nov|des))/i);

  return {
    nights: nightsMatch ? parseInt(nightsMatch[1]) : 1,
    check_in_date: dateMatch ? dateMatch[0] : null,
  };
}

/**
 * TOOL: Database Operation (Supabase RPC)
 * Ini adalah bagian terpenting untuk integrasi
 */
async function executeBookingInDB(supabase: SupabaseClient, data: any) {
  // Memanggil database function (RPC) di Supabase
  // Pastikan Anda sudah membuat fungsi 'create_temp_booking' di Supabase SQL Editor
  const { error } = await supabase.rpc("create_temp_booking", {
    p_phone: data.phone,
    p_check_in: data.check_in,
    p_nights: data.nights,
    p_notes: data.notes,
  });

  if (error) {
    console.error("Supabase RPC Error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
