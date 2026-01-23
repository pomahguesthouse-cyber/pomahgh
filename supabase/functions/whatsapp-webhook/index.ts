import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ================= CONFIG ================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  text = text.replace(/\*\*([^*]+)\*\*/g, "*$1*");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.slice(0, 4000);
}

function validateAI(text: string): boolean {
  const banned = [
    "sebagai ai",
    "model bahasa",
    "saya tidak yakin",
    "tidak dapat membantu",
    "saya hanyalah",
    "saya tidak memiliki",
  ];
  return !banned.some((b) => text.toLowerCase().includes(b));
}

/* ================= BOOKING STATE HELPERS ================= */

function extractDate(text: string): string | null {
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function extractRoom(text: string): string | null {
  if (text.includes("standard")) return "Standard";
  if (text.includes("deluxe")) return "Deluxe";
  if (text.includes("family")) return "Family";
  return null;
}

function isYes(text: string): boolean {
  return ["ya", "iya", "ok", "oke", "betul"].some((v) =>
    text.includes(v)
  );
}

function isHumanRequest(text: string): boolean {
  return ["admin", "cs", "operator", "manusia"].some((v) =>
    text.includes(v)
  );
}

/* ================= RATE LIMIT ================= */

async function checkRateLimitDB(
  supabase: any,
  phone: string
): Promise<boolean> {
  const now = new Date();

  const { data } = await supabase
    .from("whatsapp_rate_limits")
    .select("*")
    .eq("phone_number", phone)
    .maybeSingle();

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

/* ================= CORE ================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const FONNTE_KEY = Deno.env.get("FONNTE_API_KEY")!;
    const body = await req.json();

    if (!body?.sender || !body?.message) {
      return Response.json({ status: "ignored" });
    }

    const phone = normalizePhone(body.sender);
    const message = normalizeIndo(body.message);

    /* === RATE LIMIT === */
    if (!(await checkRateLimitDB(supabase, phone))) {
      return Response.json({ status: "rate_limited" });
    }

    /* === SESSION === */
    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", phone)
      .maybeSingle();

    if (session?.is_blocked) {
      return Response.json({ status: "blocked" });
    }

    let conversationId = session?.conversation_id;

    if (!conversationId) {
      const { data: conv } = await supabase
        .from("chat_conversations")
        .insert({ session_id: `wa_${phone}_${Date.now()}` })
        .select()
        .single();
      conversationId = conv.id;
    }

    await supabase.from("whatsapp_sessions").upsert({
      phone_number: phone,
      conversation_id: conversationId,
      last_message_at: new Date().toISOString(),
      is_active: true,
      session_type: "guest",
      conversation_state: session?.conversation_state ?? "idle",
      booking_data: session?.booking_data ?? {},
    });

    /* === SAVE USER MESSAGE === */
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    /* ================= STATE MACHINE ================= */

    let state = session?.conversation_state ?? "idle";
    let bookingData = session?.booking_data ?? {};
    let reply: string | null = null;
    let nextState: string | null = null;

    if (isHumanRequest(message)) {
      reply = "Baik, saya hubungkan ke admin ya 🙏";
      nextState = "human_takeover";
    } else {
      switch (state) {
        case "idle":
          reply =
            "Halo 👋 Selamat datang di Pomah Guesthouse.\n" +
            "Boleh info tanggal *check-in*? (YYYY-MM-DD)";
          nextState = "ask_checkin";
          break;

        case "ask_checkin": {
          const date = extractDate(message);
          if (!date) {
            reply = "Format tanggal belum sesuai 🙏\nContoh: *2026-02-10*";
            break;
          }
          bookingData.checkin = date;
          reply = "Siap 👍\nTanggal *check-out* kapan?";
          nextState = "ask_checkout";
          break;
        }

        case "ask_checkout": {
          const date = extractDate(message);
          if (!date) {
            reply = "Tanggal check-out belum valid 🙏";
            break;
          }
          bookingData.checkout = date;
          reply =
            "Oke ✨\nSilakan pilih tipe kamar:\n" +
            "- Standard\n- Deluxe\n- Family";
          nextState = "ask_room";
          break;
        }

        case "ask_room": {
          const room = extractRoom(message);
          if (!room) {
            reply =
              "Mohon pilih tipe kamar:\n*Standard / Deluxe / Family*";
            break;
          }
          bookingData.room = room;
          reply =
            `Mohon konfirmasi 👇\n\n` +
            `📅 Check-in: *${bookingData.checkin}*\n` +
            `📅 Check-out: *${bookingData.checkout}*\n` +
            `🏠 Kamar: *${room}*\n\n` +
            `Ketik *ya* untuk lanjut booking.`;
          nextState = "confirm";
          break;
        }

        case "confirm":
          if (!isYes(message)) {
            reply =
              "Booking dibatalkan 🙏\n" +
              "Jika ingin ulang, ketik *booking*.";
            nextState = "idle";
            bookingData = {};
            break;
          }

          reply =
            "✅ Booking berhasil dicatat!\n" +
            "Admin kami akan menghubungi untuk pembayaran 🙏";
          nextState = "done";
          break;
      }
    }

    /* === STATE RESPONSE (NO AI) === */
    if (reply) {
      await supabase.from("whatsapp_sessions").update({
        conversation_state: nextState,
        booking_data: bookingData,
        is_takeover: nextState === "human_takeover",
      }).eq("phone_number", phone);

      reply = formatWA(reply);

      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
      });

      await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: FONNTE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: phone,
          message: reply,
          countryCode: "62",
        }),
      });

      return Response.json({ status: "state_reply" });
    }

    /* ================= AI FALLBACK ================= */

    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(10);

    const aiRes = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/chatbot`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY"
          )}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: history,
          channel: "whatsapp",
          system_state: state,
        }),
      }
    );

    if (!aiRes.ok) throw new Error("AI error");

    const aiData = await aiRes.json();
    let aiText = aiData?.choices?.[0]?.message?.content ?? "";

    if (!aiText || !validateAI(aiText)) {
      aiText = "Baik, admin kami akan bantu sebentar lagi 🙏";
      await supabase
        .from("whatsapp_sessions")
        .update({ is_takeover: true })
        .eq("phone_number", phone);
    }

    aiText = formatWA(aiText);

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: aiText,
    });

    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: FONNTE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: phone,
        message: aiText,
        countryCode: "62",
      }),
    );

    return Response.json({ status: "success" });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ status: "error", message: String(e) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
