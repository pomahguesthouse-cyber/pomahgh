import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from "../types.ts";
import { sendWhatsApp } from "../services/fonnte.ts";
import { logMessage } from "../services/conversation.ts";
import { TraceContext } from "../../_shared/traceContext.ts";

/**
 * Handle Guest Booking Flow
 *
 * Strategi:
 * 1. Cek apakah ada data booking yang belum lengkap (misal: tanggal/jumlah malam).
 * 2. Jika tidak lengkap, BUKAN error, melainkan bertanya balik dengan sopan.
 * 3. Jika data lengkap, panggil tool booking.
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
    // 1. Ekstrak data dari percakapan atau konteks (Misalnya: tanggal, jumlah malam)
    // Di sini Anda biasanya memanggil LLM/Tool untuk mengekstrak entity
    const bookingIntent = await extractBookingDetails(message, recentMessages);

    // 2. Validasi Data Booking
    // Jika user bilang "booking 3 malam" tapi belum ada TANGGAL CHECK-IN
    if (bookingIntent.needs_check_in_date) {
      const reply = `Baik kak, untuk booking 3 malamnya, boleh saya tahu tanggal berapa rencananya mau check-in? 😊`;
      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);
      return new Response(JSON.stringify({ status: "awaiting_check_in_date" }), { status: 200 });
    }

    // 3. Jika data lengkap, jalankan proses booking via tool
    // Simulasi pemanggilan tool
    const bookingResult = await processBookingTool(supabase, phone, bookingIntent);

    if (bookingResult.success) {
      const reply = `Booking berhasil! Detail booking Anda sudah tercatat untuk ${bookingIntent.nights} malam. Mohon tunggu admin kami memverifikasi ya 🙏`;
      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);
    } else {
      // Jika terjadi error sistem di sisi database/tool, berikan pesan yang tidak memicu loop
      const reply = `Mohon maaf, sedang ada kendala pada sistem booking. Saya sudah laporkan ke admin untuk dibantu proses manual ya, Kak. Mohon ditunggu sebentar 🙏`;
      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);
    }

    return new Response(JSON.stringify({ status: "success" }), { status: 200 });
  } catch (error) {
    console.error("Booking Flow Error:", error);
    // Jangan biarkan error menyebar ke orchestrator jika bisa ditangani dengan balasan ke user
    return new Response(JSON.stringify({ status: "error", message: "Failed in booking flow" }), { status: 500 });
  }
}

/**
 * Mock/Helper untuk mengekstrak detail.
 * Di produksi, Anda bisa menggunakan LLM untuk memparsing intent.
 */
async function extractBookingDetails(message: string, history?: any[]) {
  // Logic untuk membaca tanggal/jumlah malam dari teks
  const nightsMatch = message.match(/(\d+)\s*malam/i);
  return {
    nights: nightsMatch ? parseInt(nightsMatch[1]) : 0,
    needs_check_in_date: !message.match(/\d{1,2}\s*(jan|feb|mar|apr|mei|jun|jul|agt|sep|okt|nov|des)/i),
  };
}

/**
 * Simulasi memanggil tool database
 */
async function processBookingTool(supabase: SupabaseClient, phone: string, details: any) {
  // Contoh: panggil fungsi update_booking atau insert_booking di Supabase
  try {
    // const { data, error } = await supabase.rpc('create_booking', { ... });
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}
