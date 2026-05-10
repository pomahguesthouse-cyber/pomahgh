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
    // 1. DETEKSI MODE: Apakah user ingin update booking yang sudah ada?
    const historyText = recentMessages?.map((m) => m.content).join(" ") || "";
    const bookingCodeMatch = historyText.match(/PMH-[A-Z0-9]+/i);
    const isUpdateIntent = bookingCodeMatch && /\b(jadi|ubah|ganti|malam)\b/i.test(message);

    if (isUpdateIntent) {
      return await handleUpdateBooking(supabase, phone, conversationId, bookingCodeMatch![0], message, env);
    }

    // 2. LOGIKA BOOKING BARU
    return await handleNewBooking(supabase, phone, conversationId, message, env);
  } catch (error) {
    console.error("Booking Flow Error:", error);
    const reply =
      "Mohon maaf kak, sistem sedang sibuk. Mohon tunggu sebentar, saya akan coba proses kembali atau hubungkan ke admin 🙏";
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: "error_handled" }));
  }
}

// --- FUNGSI UPDATE BOOKING (DENGAN KALKULASI TANGGAL) ---
async function handleUpdateBooking(
  supabase: SupabaseClient,
  phone: string,
  convId: string,
  code: string,
  msg: string,
  env: EnvConfig,
) {
  const newNightsMatch = msg.match(/(\d+)\s*malam/i);
  const newNights = newNightsMatch ? parseInt(newNightsMatch[1]) : null;

  if (!newNights) {
    const reply = `Kak, mau diubah jadi berapa malam ya? Mohon sebutkan jumlah malamnya 🙏`;
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: "awaiting_nights" }));
  }

  // Ambil tanggal check-in asli dari database
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("check_in_date")
    .eq("booking_code", code)
    .single();

  if (fetchError || !booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  // Hitung ulang check-out: Check-in + jumlah malam baru
  const checkIn = new Date(booking.check_in_date);
  const newCheckOut = new Date(checkIn);
  newCheckOut.setDate(checkIn.getDate() + newNights);

  // Update database
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      nights: newNights,
      check_out_date: newCheckOut.toISOString(),
    })
    .eq("booking_code", code);

  if (updateError) throw new Error("DB_UPDATE_FAILED");

  const reply = `Siap Kak, booking ${code} sudah diubah jadi ${newNights} malam. Check-out menjadi tanggal ${newCheckOut.toLocaleDateString("id-ID")}. Totalnya sudah disesuaikan ya Kak 🙏`;

  await sendWhatsApp(phone, reply, env.fonnteApiKey);
  await logMessage(supabase, convId, "assistant", reply);
  return new Response(JSON.stringify({ status: "success" }));
}

// --- FUNGSI BOOKING BARU ---
async function handleNewBooking(supabase: SupabaseClient, phone: string, convId: string, msg: string, env: EnvConfig) {
  // Parsing dasar untuk booking baru
  const dateMatch = msg.match(/\d{1,2}\s*(jan|feb|mar|apr|mei|jun|jul|agt|sep|okt|nov|des)/i);

  if (!dateMatch) {
    const reply = "Baik kak, untuk booking barunya, rencana check-in tanggal berapa ya? 😊";
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, convId, "assistant", reply);
    return new Response(JSON.stringify({ status: "awaiting_date" }));
  }

  // Simpan booking baru...
  // (Tambahkan logika insert database Anda di sini)

  return new Response(JSON.stringify({ status: "success" }));
}
