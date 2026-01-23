import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ================= CONFIG ================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60_000;

/* ================= UTIL ================= */

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
  return text.slice(0, 4000).trim();
}

/* ================= RATE LIMIT ================= */

async function checkRateLimitDB(supabase: any, phone: string) {
  const now = new Date();

  const { data } = await supabase.from("whatsapp_rate_limits").select("*").eq("phone_number", phone).single();

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
    .eq("phone_number", phone);

  return true;
}

/* ================= SUMMARY ENGINE ================= */

function updateConversationSummary(summary: any, message: string) {
  const s = { ...(summary || {}) };

  // intent
  if (/pesan|booking|book|nginap/i.test(message)) {
    s.intent = "booking";
  }

  // room
  const roomMatch = message.match(/(single|deluxe|grand\s*deluxe|family\s*suite)/i);
  if (roomMatch) {
    s.room = roomMatch[1].replace(/\s+/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // guests
  const guestMatch = message.match(/(\d+)\s*(orang|tamu|pax)/i);
  if (guestMatch) {
    s.guests = parseInt(guestMatch[1]);
  }

  // email
  const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,})/);
  if (emailMatch) s.guest_email = emailMatch[1];

  // nama (heuristik sederhana)
  if (!s.guest_name && message.split(" ").length <= 4) {
    s.guest_name = message.trim();
  }

  // state lock
  if (s.room && s.check_in && s.check_out && !s.guests) {
    s.state = "awaiting_guest_data";
  }

  if (s.room && s.check_in && s.check_out && s.guests) {
    s.state = "ready_to_confirm";
  }

  return s;
}

/* ================= BOOKING DRAFT ================= */

function canGenerateDraft(summary: any): boolean {
  return Boolean(
    summary?.intent === "booking" && summary?.room && summary?.check_in && summary?.check_out && summary?.guests,
  );
}

function calculateNights(checkIn: string, checkOut: string): number {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diff = outDate.getTime() - inDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/* ================= AI SAFETY ================= */

function validateAI(text: string) {
  const banned = ["sebagai ai", "saya tidak yakin", "tidak dapat membantu"];
  return !banned.some((b) => text.toLowerCase().includes(b));
}

/* ================= MAIN ================= */

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

    /* === RATE LIMIT === */
    if (!(await checkRateLimitDB(supabase, phone))) {
      return Response.json({ status: "rate_limited" });
    }

    /* === SESSION === */
    const { data: session } = await supabase.from("whatsapp_sessions").select("*").eq("phone_number", phone).single();

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

    /* === UPDATE SUMMARY === */
    const updatedSummary = updateConversationSummary(session?.conversation_summary, message);

    await supabase.from("whatsapp_sessions").upsert({
      phone_number: phone,
      conversation_id: conversationId,
      conversation_summary: updatedSummary,
      conversation_state: updatedSummary?.state ?? "idle",
      last_message_at: new Date().toISOString(),
      is_active: true,
      session_type: "guest",
    });

    /* === AUTO BOOKING DRAFT === */
    if (canGenerateDraft(updatedSummary)) {
      const nights = calculateNights(updatedSummary.check_in, updatedSummary.check_out);

      const { data: existing } = await supabase
        .from("booking_drafts")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("status", "draft")
        .single();

      const payload = {
        phone,
        conversation_id: conversationId,
        summary: updatedSummary,
        guest_name: updatedSummary.guest_name,
        guest_email: updatedSummary.guest_email,
        guest_phone: phone,
        room_type: updatedSummary.room,
        check_in: updatedSummary.check_in,
        check_out: updatedSummary.check_out,
        nights,
        guests: updatedSummary.guests,
      };

      if (existing) {
        await supabase.from("booking_drafts").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("booking_drafts").insert(payload);
      }
    }

    /* === LOG USER MESSAGE === */
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    /* === AI CALL === */
    const aiRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/chatbot`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `
Anda adalah WhatsApp Assistant Pomah Guesthouse.
Ikuti STATE ini dengan KETAT.
DILARANG mengulang pertanyaan.

STATE:
${JSON.stringify(updatedSummary, null, 2)}

RULES:
- awaiting_guest_data → minta nama, email, nomor
- ready_to_confirm → konfirmasi booking
              `,
          },
          { role: "user", content: message },
        ],
        channel: "whatsapp",
      }),
    });

    if (!aiRes.ok) throw new Error("AI error");

    const aiData = await aiRes.json();
    let aiText = aiData.choices?.[0]?.message?.content ?? "";

    if (!aiText || !validateAI(aiText)) {
      aiText = "Baik, admin kami akan bantu sebentar lagi 🙏";
      await supabase.from("whatsapp_sessions").update({ is_takeover: true }).eq("phone_number", phone);
    }

    aiText = formatWA(aiText);

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: aiText,
    });

    /* === SEND WHATSAPP === */
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
    });

    return Response.json({ status: "success" });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ status: "error", message: String(e) }), { status: 500, headers: corsHeaders });
  }
});
