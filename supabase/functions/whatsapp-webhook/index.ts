import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ================= CONFIG ================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60_000;

/* ================= HELPERS ================= */

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (!p.startsWith("62")) p = "62" + p;
  return p;
}

function normalizeIndo(msg: string): string {
  const map: Record<string, string> = {
    brp: "berapa",
    gk: "tidak",
    ga: "tidak",
    kmr: "kamar",
    bsa: "bisa",
    makasih: "terima kasih",
  };

  let t = msg.toLowerCase();
  for (const k in map) {
    t = t.replace(new RegExp(`\\b${k}\\b`, "gi"), map[k]);
  }
  return t.trim();
}

function formatWA(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").slice(0, 4000);
}

function extractDate(text: string): string | null {
  const m = text.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function extractRoom(text: string): string | null {
  if (text.includes("standard")) return "Standard";
  if (text.includes("deluxe")) return "Deluxe";
  if (text.includes("family")) return "Family";
  return null;
}

function isYes(text: string): boolean {
  return ["ya", "iya", "ok", "oke", "betul"].some((v) => text.includes(v));
}

function isHumanRequest(text: string): boolean {
  return ["admin", "cs", "operator"].some((v) => text.includes(v));
}

/* ================= RATE LIMIT ================= */

async function checkRateLimitDB(supabase: any, phone: string): Promise<boolean> {
  const now = new Date();

  const { data } = await supabase.from("whatsapp_rate_limits").select("*").eq("phone_number", phone).maybeSingle();

  if (!data || new Date(data.reset_at) < now) {
    await supabase.from("whatsapp_rate_limits").upsert({
      phone_number: phone,
      count: 1,
      reset_at: new Date(now.getTime() + RATE_LIMIT_WINDOW).toISOString(),
    });
    return true;
  }

  if (data.count >= RATE_LIMIT_MAX) return false;

  await supabase
    .from("whatsapp_rate_limits")
    .update({ count: data.count + 1 })
    .eq("phone_number", phone)
    .eq("count", data.count);

  return true;
}

/* ================= AVAILABILITY ================= */

async function checkAvailability(supabase: any, room: string, checkin: string, checkout: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_room_availability", {
    p_room_type: room,
    p_checkin: checkin,
    p_checkout: checkout,
  });

  if (error) {
    console.error("availability error", error);
    return false;
  }

  return data === true;
}

/* ================= STATE MACHINE (SAFE) ================= */

async function handleBookingState(
  supabase: any,
  session: any,
  message: string,
): Promise<{
  reply: string | null;
  nextState: string | null;
  bookingData: any;
}> {
  let state = session?.conversation_state ?? "idle";
  let bookingData = session?.booking_data ?? {};
  let reply: string | null = null;
  let nextState: string | null = null;

  if (isHumanRequest(message)) {
    return {
      reply: "Baik, saya hubungkan ke admin ya 🙏",
      nextState: "human_takeover",
      bookingData,
    };
  }

  switch (state) {
    case "idle":
      reply = "Halo 👋 Selamat datang di Pomah Guesthouse.\n" + "Tanggal *check-in* kapan? (YYYY-MM-DD)";
      nextState = "ask_checkin";
      break;

    case "ask_checkin": {
      const d = extractDate(message);
      if (!d) {
        reply = "Format salah 🙏 contoh: *2026-02-10*";
        break;
      }
      bookingData.checkin = d;
      reply = "Siap 👍 tanggal *check-out* kapan?";
      nextState = "ask_checkout";
      break;
    }

    case "ask_checkout": {
      const d = extractDate(message);
      if (!d) {
        reply = "Tanggal check-out belum valid 🙏";
        break;
      }
      bookingData.checkout = d;
      reply = "Pilih tipe kamar:\n- Standard\n- Deluxe\n- Family";
      nextState = "ask_room";
      break;
    }

    case "ask_room": {
      const room = extractRoom(message);
      if (!room) {
        reply = "Mohon pilih:\n*Standard / Deluxe / Family*";
        break;
      }

      const available = await checkAvailability(supabase, room, bookingData.checkin, bookingData.checkout);

      if (!available) {
        reply = `❌ Kamar *${room}* penuh di tanggal tersebut.\n` + "Silakan pilih kamar lain.";
        break;
      }

      bookingData.room = room;
      reply =
        `✅ Kamar tersedia!\n\n` +
        `📅 ${bookingData.checkin} → ${bookingData.checkout}\n` +
        `🏠 ${room}\n\n` +
        `Ketik *ya* untuk konfirmasi.`;
      nextState = "confirm";
      break;
    }

    case "confirm":
      if (!isYes(message)) {
        reply = "Booking dibatalkan.\n" + "Ketik *booking* untuk mulai ulang.";
        bookingData = {};
        nextState = "idle";
        break;
      }

      reply = "✅ Booking dicatat!\n" + "Admin akan menghubungi untuk pembayaran 🙏";
      nextState = "done";
      break;
  }

  return { reply, nextState, bookingData };
}

/* ================= CORE ================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const FONNTE_KEY = Deno.env.get("FONNTE_API_KEY")!;
    const body = await req.json();

    if (!body?.sender || !body?.message) {
      return Response.json({ status: "ignored" });
    }

    const phone = normalizePhone(body.sender);
    const message = normalizeIndo(body.message);

    if (!(await checkRateLimitDB(supabase, phone))) {
      return Response.json({ status: "rate_limited" });
    }

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", phone)
      .maybeSingle();

    let conversationId = session?.conversation_id;

    if (!conversationId) {
      const { data } = await supabase
        .from("chat_conversations")
        .insert({ session_id: `wa_${phone}_${Date.now()}` })
        .select()
        .single();
      conversationId = data.id;
    }

    await supabase.from("whatsapp_sessions").upsert({
      phone_number: phone,
      conversation_id: conversationId,
      conversation_state: session?.conversation_state ?? "idle",
      booking_data: session?.booking_data ?? {},
      last_message_at: new Date().toISOString(),
      is_active: true,
    });

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    const { reply, nextState, bookingData } = await handleBookingState(supabase, session, message);

    if (reply) {
      await supabase
        .from("whatsapp_sessions")
        .update({
          conversation_state: nextState,
          booking_data: bookingData,
          is_takeover: nextState === "human_takeover",
        })
        .eq("phone_number", phone);

      const formatted = formatWA(reply);

      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: formatted,
      });

      await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: FONNTE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: phone,
          message: formatted,
          countryCode: "62",
        }),
      });

      return Response.json({ status: "state_reply" });
    }

    return Response.json({ status: "no_action" });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ status: "error", message: String(e) }), { status: 500, headers: corsHeaders });
  }
});
