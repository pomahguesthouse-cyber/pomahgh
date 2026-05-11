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
    return await handleNewBooking(supabase, phone, conversationId, message, env, recentMessages);
  } catch (error) {
    console.error("Booking Flow Error:", error);
    // Fallback: tidak mengirim pesan error teknis, tapi menyapa balik dengan sopan
    const reply = "Baik kak, silakan infokan tanggal check-in yang diinginkan agar bisa segera saya proses ya 🙏";
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    return new Response(JSON.stringify({ status: "error_handled" }));
  }
}

async function handleNewBooking(
  supabase: SupabaseClient,
  phone: string,
  convId: string,
  msg: string,
  env: EnvConfig,
  recentMessages?: any[],
) {
  // Helpers: WIB (UTC+7) calendar dates → ISO YYYY-MM-DD
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const wibNow = () => new Date(Date.now() + WIB_OFFSET_MS);
  const toISODate = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const addDaysISO = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return toISODate(d);
  };

  const MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6,
    jul: 7, agt: 8, agu: 8, ags: 8, sep: 9, okt: 10, nov: 11, des: 12,
  };

  const now = wibNow();
  let checkInISO: string | null = null;

  // Helper: parse 1 string apapun → ISO date (dipakai untuk msg saat ini & history)
  const parseDateFrom = (text: string): string | null => {
    const t = text.toLowerCase();
    if (t.includes("hari ini")) return toISODate(now);
    if (t.includes("besok")) {
      const x = new Date(now); x.setUTCDate(x.getUTCDate() + 1); return toISODate(x);
    }
    if (t.includes("lusa")) {
      const x = new Date(now); x.setUTCDate(x.getUTCDate() + 2); return toISODate(x);
    }
    const m = text.match(/(\d{1,2})\s*(jan|feb|mar|apr|mei|jun|jul|agt|agu|ags|sep|okt|nov|des)[a-z]*\s*(\d{4})?/i);
    if (m) {
      const day = parseInt(m[1], 10);
      const month = MONTHS[m[2].toLowerCase()];
      const year = m[3] ? parseInt(m[3], 10) : now.getUTCFullYear();
      const candidate = new Date(Date.UTC(year, month - 1, day));
      if (!m[3] && candidate < new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))) {
        candidate.setUTCFullYear(year + 1);
      }
      return toISODate(candidate);
    }
    const m2 = text.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
    if (m2) {
      const day = parseInt(m2[1], 10);
      const month = parseInt(m2[2], 10);
      let year = m2[3] ? parseInt(m2[3], 10) : now.getUTCFullYear();
      if (year < 100) year += 2000;
      return toISODate(new Date(Date.UTC(year, month - 1, day)));
    }
    return null;
  };

  checkInISO = parseDateFrom(msg);

  // Fallback: jika pesan saat ini TIDAK menyebut tanggal, cari di riwayat
  // (8 pesan terakhir baik dari tamu maupun bot). Mencegah bot tanya tanggal
  // berulang-ulang padahal tanggal sudah pernah disebut sebelumnya.
  if (!checkInISO && recentMessages?.length) {
    for (const m of recentMessages.slice(-8).reverse()) {
      const cand = parseDateFrom(String(m?.content ?? ""));
      if (cand) { checkInISO = cand; break; }
    }
  }

  if (!checkInISO) {
    const reply =
      "Baik kak, untuk booking-nya, rencana check-in tanggal berapa ya? (Bisa tulis tanggal misal: 10 Mei, atau 'hari ini') 😊";
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, convId, "assistant", reply);
    return new Response(JSON.stringify({ status: "awaiting_date" }));
  }

  // Parse jumlah malam (default 1)
  const nightsMatch = msg.match(/(\d{1,2})\s*malam/i);
  const nights = nightsMatch ? Math.max(1, Math.min(30, parseInt(nightsMatch[1], 10))) : 1;
  const checkOutISO = addDaysISO(checkInISO, nights);

  // Parse jumlah tamu (optional)
  const guestsMatch = msg.match(/(\d{1,2})\s*(orang|tamu|pax)/i);
  const numGuests = guestsMatch ? parseInt(guestsMatch[1], 10) : undefined;

  // Panggil chatbot-tools untuk check_availability (sumber tunggal kebenaran)
  try {
    const resp = await fetch(`${env.supabaseUrl}/functions/v1/chatbot-tools`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.chatbotToolsInternalSecret,
        Authorization: `Bearer ${env.supabaseServiceKey}`,
      },
      body: JSON.stringify({
        tool_name: "check_availability",
        parameters: { check_in: checkInISO, check_out: checkOutISO, num_guests: numGuests },
      }),
    });

    if (!resp.ok) throw new Error(`chatbot-tools ${resp.status}`);
    const data = await resp.json();

    const fmtDate = (iso: string) => {
      const [y, mo, d] = iso.split("-").map(Number);
      return `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`;
    };
    const fmtRp = (n: number | null | undefined) =>
      typeof n === "number" ? `Rp${n.toLocaleString("id-ID")}` : "-";

    interface AvailRoom {
      name: string;
      available_count: number;
      price_per_night: number | null;
    }
    const available: AvailRoom[] = data.available_rooms || [];
    const soldOut: string[] = data.sold_out_rooms || [];

    let reply: string;
    if (available.length === 0) {
      reply =
        `Mohon maaf kak, untuk tanggal ${fmtDate(checkInISO)} – ${fmtDate(checkOutISO)} (${nights} malam) ` +
        `semua kamar sudah HABIS 🙏 Ingin coba tanggal lain?`;
    } else {
      const lines = available.map(
        (r) => `✅ *${r.name}* — ${r.available_count} kamar tersedia • ${fmtRp(r.price_per_night)}/malam`,
      );
      reply =
        `📅 Ketersediaan ${fmtDate(checkInISO)} – ${fmtDate(checkOutISO)} (${nights} malam):\n\n` +
        lines.join("\n");
      if (soldOut.length > 0) {
        reply += `\n\n❌ Habis: ${soldOut.join(", ")}`;
      }
      reply += `\n\nMau lanjut booking kamar yang mana kak? 😊`;
    }

    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, convId, "assistant", reply);
    return new Response(JSON.stringify({ status: "availability_sent" }));
  } catch (err) {
    console.error("check_availability call failed:", err);
    const reply =
      `Mohon maaf kak, sedang ada kendala saat mengecek ketersediaan kamar untuk ${checkInISO}. ` +
      `Saya teruskan ke admin ya 🙏`;
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, convId, "assistant", reply);
    return new Response(JSON.stringify({ status: "availability_error" }));
  }
}
