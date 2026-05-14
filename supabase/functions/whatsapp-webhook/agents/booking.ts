import type { SupabaseClient, WhatsAppSession, ManagerInfo, EnvConfig } from "../types.ts";
import { sendWhatsApp } from "../services/fonnte.ts";
import { logMessage } from "../services/conversation.ts";
import { logChatbotAlert } from "../services/alerts.ts";
import { updateSession } from "../services/session.ts";
import { TraceContext } from "../../_shared/traceContext.ts";
import { composeReplyWithTraining } from "../../_shared/trainingAugmentedReply.ts";

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
    // Diperluas: early/late check-in/out, extend, perpanjang, tambah malam,
    // batal, refund, ganti kamar, dsb. Juga: kalau pesan diawali "ak/saya
    // dah booking" → tetap escalate agar tidak nyasar ke flow availability.
    const historyText = recentMessages?.map((m) => m.content).join(" ") || "";
    const bookingCodeMatch = historyText.match(/PMH-[A-Z0-9]+/i);
    const updateKeywords =
      /\b(jadinya|ubah|ganti|rubah|menjadi|early\s*(check\s*in|ci)|late\s*(check\s*out|co)|extend|perpanjang|tambah\s*malam|batal|cancel|refund|pindah\s*kamar|upgrade|downgrade)\b/i;
    const alreadyBookedPhrase = /\b(udah|sudah|dah|telah)\s+(book|booking|pesan|reservasi)\b/i;
    const isUpdateIntent =
      bookingCodeMatch && (updateKeywords.test(message) || alreadyBookedPhrase.test(message));

    if (isUpdateIntent) {
      const bookingCode = bookingCodeMatch![0];
      const isRefundCancel = /\b(batal|cancel|refund)\b/i.test(message);
      const reasonText = (() => {
        const m = message.match(updateKeywords);
        if (m) return m[0];
        if (alreadyBookedPhrase.test(message)) return "menyebutkan booking aktif";
        return "perubahan booking";
      })();
      await logMessage(
        supabase,
        conversationId,
        "system",
        `⚠️ Tamu minta update booking ${bookingCode} (${reasonText}): "${message}"`,
      );
      const fallbackReply = `Kak, permintaan perubahan untuk booking ${bookingCode} sudah saya teruskan ke admin kami ya agar dibantu proses secara manual. Mohon ditunggu sebentar 🙏`;
      const reply = await composeReplyWithTraining({
        supabase,
        userMessage: message,
        facts: `Kode booking: ${bookingCode}\nJenis permintaan: ${isRefundCancel ? "pembatalan/refund" : "perubahan booking"}\nKonteks: ${reasonText}\nAksi sistem: sudah dieskalasi ke admin manusia.`,
        instruction:
          "Tamu minta perubahan/pembatalan booking. Konfirmasi singkat bahwa permintaan sudah diteruskan ke admin manusia, minta tamu tunggu sebentar. JANGAN menjanjikan hasil apa pun (approve/refund) — keputusan ada di admin.",
        fallback: fallbackReply,
        recentMessages: recentMessages as Array<{ role: string; content: string }> | undefined,
      });
      await sendWhatsApp(phone, reply, env.fonnteApiKey);
      await logMessage(supabase, conversationId, "assistant", reply);
      await logChatbotAlert(supabase, {
        alert_type: isRefundCancel ? "refund_cancel_intent" : "booking_update_escalation",
        phone_number: phone,
        conversation_id: conversationId,
        last_user_message: message,
        intent: isRefundCancel ? "refund_cancel" : "booking_update",
        booking_code: bookingCode,
        reason: reasonText,
        recentMessages: recentMessages as Array<{ role: string; content: string }> | undefined,
      });
      await updateSession(supabase, phone, conversationId, false);
      return new Response(JSON.stringify({ status: "escalated_to_admin" }));
    }

    // 2. LOGIKA BOOKING BARU
    return await handleNewBooking(supabase, phone, conversationId, message, env, recentMessages);
  } catch (error) {
    console.error("Booking Flow Error:", error);
    // Fallback: tidak mengirim pesan error teknis, tapi menyapa balik dengan sopan
    const reply = "Baik kak, silakan infokan tanggal check-in yang diinginkan agar bisa segera saya proses ya 🙏";
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await updateSession(supabase, phone, conversationId, false);
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
  let checkOutFromRange: string | null = null;

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
      // Validasi: bulan harus 1-12 dan hari 1-31. Tanpa ini, "12-13" akan
      // diparse sebagai tgl 12 bulan 13 → Date.UTC overflow ke Jan tahun depan.
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      let year = m2[3] ? parseInt(m2[3], 10) : now.getUTCFullYear();
      if (year < 100) year += 2000;
      return toISODate(new Date(Date.UTC(year, month - 1, day)));
    }
    return null;
  };

  // Helper: parse range tanggal (check-in & check-out) dari satu string.
  // Pola yang dikenali (urutan = prioritas):
  //   - "12-13 Juni"               → 12 Jun → 13 Jun
  //   - "12 Juni - 13 Juni 2026"   → 12 Jun → 13 Jun 2026
  //   - "13/06/2026 - 15/06/2026"  → 13 Jun → 15 Jun
  //   - "12-13/6"                  → 12 Jun → 13 Jun
  const parseDateRangeFrom = (text: string): { checkIn: string; checkOut: string } | null => {
    const monthRe = "(jan|feb|mar|apr|mei|jun|jul|agt|agu|ags|sep|okt|nov|des)[a-z]*";
    const yearRollIfPast = (iso: string, hasYear: boolean): string => {
      if (hasYear) return iso;
      const today = toISODate(now);
      if (iso >= today) return iso;
      const d = new Date(`${iso}T00:00:00Z`);
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      return toISODate(d);
    };

    // Pola 1: "12-13 Juni [2026]"
    const r1 = text.match(new RegExp(`(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s*${monthRe}\\s*(\\d{4})?`, "i"));
    if (r1) {
      const d1 = parseInt(r1[1], 10);
      const d2 = parseInt(r1[2], 10);
      const month = MONTHS[r1[3].toLowerCase()];
      const hasYear = !!r1[4];
      const year = hasYear ? parseInt(r1[4], 10) : now.getUTCFullYear();
      if (d1 >= 1 && d1 <= 31 && d2 >= 1 && d2 <= 31 && d2 > d1) {
        const ci = toISODate(new Date(Date.UTC(year, month - 1, d1)));
        const co = toISODate(new Date(Date.UTC(year, month - 1, d2)));
        return { checkIn: yearRollIfPast(ci, hasYear), checkOut: yearRollIfPast(co, hasYear) };
      }
    }

    // Pola 2: "12 Juni - 13 Juni [2026]"
    const r2 = text.match(new RegExp(`(\\d{1,2})\\s*${monthRe}\\s*[-–]\\s*(\\d{1,2})\\s*${monthRe}\\s*(\\d{4})?`, "i"));
    if (r2) {
      const d1 = parseInt(r2[1], 10);
      const m1 = MONTHS[r2[2].toLowerCase()];
      const d2 = parseInt(r2[3], 10);
      const m2m = MONTHS[r2[4].toLowerCase()];
      const hasYear = !!r2[5];
      const year = hasYear ? parseInt(r2[5], 10) : now.getUTCFullYear();
      const ci = toISODate(new Date(Date.UTC(year, m1 - 1, d1)));
      let co = toISODate(new Date(Date.UTC(year, m2m - 1, d2)));
      // Kalau check-out < check-in (cross-year), naikkan tahun check-out.
      if (co < ci) {
        co = toISODate(new Date(Date.UTC(year + 1, m2m - 1, d2)));
      }
      return { checkIn: yearRollIfPast(ci, hasYear), checkOut: yearRollIfPast(co, hasYear) };
    }

    // Pola 3: "13/06/2026 - 15/06/2026"
    const r3 = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\s*[-–]\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (r3) {
      const d1 = parseInt(r3[1], 10), m1 = parseInt(r3[2], 10);
      let y1 = parseInt(r3[3], 10); if (y1 < 100) y1 += 2000;
      const d2 = parseInt(r3[4], 10), m2m = parseInt(r3[5], 10);
      let y2 = parseInt(r3[6], 10); if (y2 < 100) y2 += 2000;
      if (m1 >= 1 && m1 <= 12 && m2m >= 1 && m2m <= 12) {
        return {
          checkIn: toISODate(new Date(Date.UTC(y1, m1 - 1, d1))),
          checkOut: toISODate(new Date(Date.UTC(y2, m2m - 1, d2))),
        };
      }
    }

    // Pola 4: "12-13/6" atau "12-13/6/2026"
    const r4 = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
    if (r4) {
      const d1 = parseInt(r4[1], 10);
      const d2 = parseInt(r4[2], 10);
      const month = parseInt(r4[3], 10);
      const hasYear = !!r4[4];
      let year = hasYear ? parseInt(r4[4], 10) : now.getUTCFullYear();
      if (year < 100) year += 2000;
      if (month >= 1 && month <= 12 && d1 >= 1 && d2 >= 1 && d2 > d1) {
        const ci = toISODate(new Date(Date.UTC(year, month - 1, d1)));
        const co = toISODate(new Date(Date.UTC(year, month - 1, d2)));
        return { checkIn: yearRollIfPast(ci, hasYear), checkOut: yearRollIfPast(co, hasYear) };
      }
    }

    return null;
  };

  // Pola tambahan: "check in 17 check out 18" (angka polos tanpa bulan).
  // Default ke bulan berjalan; kalau sudah lewat → bulan berikutnya.
  const parseCheckInOutNumeric = (
    text: string,
  ): { checkIn: string; checkOut: string } | null => {
    const r = text.match(/check\s*in[^\d]{0,15}(\d{1,2})[\s\S]{0,40}?check\s*out[^\d]{0,15}(\d{1,2})/i);
    if (!r) return null;
    const d1 = parseInt(r[1], 10);
    const d2 = parseInt(r[2], 10);
    if (d1 < 1 || d1 > 31 || d2 < 1 || d2 > 31 || d2 <= d1) return null;
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1; // 1-12
    const today = now.getUTCDate();
    if (d1 < today) {
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    }
    const ci = toISODate(new Date(Date.UTC(year, month - 1, d1)));
    const co = toISODate(new Date(Date.UTC(year, month - 1, d2)));
    return { checkIn: ci, checkOut: co };
  };

  // Cek pola range DULU sebelum single date supaya "12-13 Juni" tidak salah
  // ditafsirkan jadi "13 Juni" oleh single-date regex.
  const range = parseDateRangeFrom(msg) ?? parseCheckInOutNumeric(msg);
  if (range) {
    checkInISO = range.checkIn;
    checkOutFromRange = range.checkOut;
  } else {
  checkInISO = parseDateFrom(msg);
  }

  // Fallback: jika pesan saat ini TIDAK menyebut tanggal, cari di riwayat
  // (8 pesan terakhir baik dari tamu maupun bot). Mencegah bot tanya tanggal
  // berulang-ulang padahal tanggal sudah pernah disebut sebelumnya.
  if (!checkInISO && recentMessages?.length) {
    for (const m of recentMessages.slice(-8).reverse()) {
      const text = String(m?.content ?? "");
      const histRange = parseDateRangeFrom(text) ?? parseCheckInOutNumeric(text);
      if (histRange) {
        checkInISO = histRange.checkIn;
        checkOutFromRange = histRange.checkOut;
        break;
      }
      const cand = parseDateFrom(text);
      if (cand) { checkInISO = cand; break; }
    }
  }

  if (!checkInISO) {
    const fallbackReply =
      "Baik kak, untuk booking-nya, rencana check-in tanggal berapa ya? (Bisa tulis tanggal misal: 10 Mei, atau 'hari ini') 😊";
    const reply = await composeReplyWithTraining({
      supabase,
      userMessage: msg,
      facts: "Tanggal check-in belum disebutkan tamu.",
      instruction:
        "Tamu menyatakan ingin booking tapi belum menyebut tanggal check-in. Tanyakan tanggal check-in dengan ramah, beri contoh format singkat (misal '10 Mei' atau 'besok'). Jangan minta data lain dulu.",
      fallback: fallbackReply,
      recentMessages: recentMessages as Array<{ role: string; content: string }> | undefined,
    });
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, convId, "assistant", reply);
    // 🔔 Alert admin: tanggal tidak terdeteksi sama sekali (potensi loop tanya tanggal)
    await logChatbotAlert(supabase, {
      alert_type: "no_date_found",
      phone_number: phone,
      conversation_id: convId,
      last_user_message: msg,
      intent: "booking",
      recentMessages: recentMessages as Array<{ role: string; content: string }> | undefined,
    });
    await updateSession(supabase, phone, convId, false);
    return new Response(JSON.stringify({ status: "awaiting_date" }));
  }

  // Parse jumlah malam (default 1)
  const nightsMatch = msg.match(/(\d{1,2})\s*malam/i);
  // Prioritas: range eksplisit > "X malam" > default 1 malam.
  let checkOutISO: string;
  let nights: number;
  if (checkOutFromRange) {
    checkOutISO = checkOutFromRange;
    const ci = new Date(`${checkInISO}T00:00:00Z`).getTime();
    const co = new Date(`${checkOutISO}T00:00:00Z`).getTime();
    nights = Math.max(1, Math.round((co - ci) / 86400000));
  } else {
    nights = nightsMatch ? Math.max(1, Math.min(30, parseInt(nightsMatch[1], 10))) : 1;
    checkOutISO = addDaysISO(checkInISO, nights);
  }

  // Parse jumlah tamu (optional)
  const guestsMatch = msg.match(/(\d{1,2})\s*(orang|tamu|pax)/i);
  const numGuests = guestsMatch ? parseInt(guestsMatch[1], 10) : undefined;

  // Deteksi multi-kamar: "(2 kamar)" / "2 kamar" / "butuh 3 kamar".
  // Chatbot belum support multi-room booking otomatis → escalate ke admin
  // supaya tidak salah konfirmasi 1 kamar.
  const roomCountMatch = msg.match(/(\d{1,2})\s*kamar\b/i);
  const numRooms = roomCountMatch ? parseInt(roomCountMatch[1], 10) : 1;
  if (numRooms >= 2) {
    // Cek apakah ada kode booking PMH- di riwayat (untuk konteks)
    const histText = recentMessages?.map((m) => m.content).join(" ") || "";
    const bookingCode = histText.match(/PMH-[A-Z0-9]+/i)?.[0] ?? null;
    const fmtD = (iso: string) => { const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
    const fallbackReply =
      `Baik kak, untuk booking ${numRooms} kamar (${numGuests ?? "?"} tamu) di tanggal ` +
      `${fmtD(checkInISO)} – ${fmtD(checkOutISO)} sudah saya teruskan ke admin kami untuk dibantu ` +
      `proses ya 🙏 Mohon ditunggu sebentar.`;
    const reply = await composeReplyWithTraining({
      supabase,
      userMessage: msg,
      facts: `Jumlah kamar diminta: ${numRooms}\nJumlah tamu: ${numGuests ?? "tidak disebut"}\nCheck-in: ${fmtD(checkInISO)}\nCheck-out: ${fmtD(checkOutISO)}\nAksi: dieskalasi ke admin (bot belum support multi-room otomatis).`,
      instruction:
        "Tamu minta booking lebih dari 1 kamar. Konfirmasi permintaan sudah diteruskan ke admin manusia untuk dibantu proses. Jangan menyebut harga atau ketersediaan (admin akan handle). Singkat & sopan.",
      fallback: fallbackReply,
      recentMessages: recentMessages as Array<{ role: string; content: string }> | undefined,
    });
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, convId, "assistant", reply);
    await logMessage(
      supabase,
      convId,
      "system",
      `⚠️ Multi-room request: ${numRooms} kamar, ${numGuests ?? "?"} tamu, ${checkInISO} – ${checkOutISO}. Pesan asli: "${msg}"`,
    );
    await logChatbotAlert(supabase, {
      alert_type: "multi_room_escalation",
      phone_number: phone,
      conversation_id: convId,
      last_user_message: msg,
      intent: `multi_room_${numRooms}kamar`,
      booking_code: bookingCode,
      reason: `${numRooms} kamar • ${numGuests ?? "?"} tamu • ${checkInISO} → ${checkOutISO}`,
      recentMessages: recentMessages as Array<{ role: string; content: string }> | undefined,
    });
    await updateSession(supabase, phone, convId, false);
    return new Response(JSON.stringify({ status: "multi_room_escalated" }));
  }

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

    let fallbackReply: string;
    if (available.length === 0) {
      fallbackReply =
        `Mohon maaf kak, untuk tanggal ${fmtDate(checkInISO)} – ${fmtDate(checkOutISO)} (${nights} malam) ` +
        `semua kamar sudah HABIS 🙏 Ingin coba tanggal lain?`;
    } else {
      const lines = available.map(
        (r) => `✅ *${r.name}* — ${r.available_count} kamar tersedia • ${fmtRp(r.price_per_night)}/malam`,
      );
      fallbackReply =
        `📅 Ketersediaan ${fmtDate(checkInISO)} – ${fmtDate(checkOutISO)} (${nights} malam):\n\n` +
        lines.join("\n");
      if (soldOut.length > 0) {
        fallbackReply += `\n\n❌ Habis: ${soldOut.join(", ")}`;
      }
      fallbackReply += `\n\nMau lanjut booking kamar yang mana kak? 😊`;
    }

    // Untuk hasil availability, balasan deterministik sudah optimal (struktur list
    // + harga + status sold-out). Kita TIDAK kirim ke LLM agar tidak ada risiko
    // halusinasi harga / mengubah angka. Training context dipakai HANYA untuk
    // path tanpa data terstruktur (no_date / multi_room / update / error).
    const reply = fallbackReply;

    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, convId, "assistant", reply);
    await updateSession(supabase, phone, convId, false);
    return new Response(JSON.stringify({ status: "availability_sent" }));
  } catch (err) {
    console.error("check_availability call failed:", err);
    const fallbackReply =
      `Mohon maaf kak, sedang ada kendala saat mengecek ketersediaan kamar untuk ${checkInISO}. ` +
      `Saya teruskan ke admin ya 🙏`;
    const reply = await composeReplyWithTraining({
      supabase,
      userMessage: msg,
      facts: `Check-in diminta: ${checkInISO}\nKendala: sistem availability sedang error.\nAksi: dieskalasi ke admin manusia.`,
      instruction:
        "Sistem cek ketersediaan gagal. Sampaikan permintaan maaf singkat & beri tahu permintaan diteruskan ke admin. Jangan menjanjikan ketersediaan atau harga.",
      fallback: fallbackReply,
      recentMessages: recentMessages as Array<{ role: string; content: string }> | undefined,
    });
    await sendWhatsApp(phone, reply, env.fonnteApiKey);
    await logMessage(supabase, convId, "assistant", reply);
    await updateSession(supabase, phone, convId, false);
    return new Response(JSON.stringify({ status: "availability_error" }));
  }
}
