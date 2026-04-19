// Payment Agent — TRANSACTION ONLY
// Role: generate invoice (data + PDF + link konfirmasi), validasi pembayaran (format + auto-confirm via manager).
// ❌ Tidak handle booking logic. ❌ Tidak ngobrol panjang ke user.
// Flow: Booking Agent → Payment Agent → Backend → Booking Agent

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const INTERNAL_SECRET = Deno.env.get("CHATBOT_TOOLS_INTERNAL_SECRET") || "";

type Action = "generate_invoice" | "submit_proof" | "check_status";

interface PaymentRequest {
  action: Action;
  booking_code?: string;
  // submit_proof
  proof_url?: string;          // public URL of uploaded image
  proof_mime?: string;          // image/jpeg, image/png, etc.
  proof_size_bytes?: number;
  declared_amount?: number;
  notes?: string;
}

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"];
const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10MB

function fmtRupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

async function generateInvoice(supabase: any, bookingCode: string) {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, booking_code, guest_name, guest_email, guest_phone, check_in, check_out, total_nights, total_price, payment_amount, payment_status, payment_expires_at, room:rooms(name)")
    .eq("booking_code", bookingCode)
    .maybeSingle();

  if (error || !booking) return { ok: false, error: "Booking tidak ditemukan" };

  const [
    { data: banks },
    { data: hotel },
  ] = await Promise.all([
    supabase.from("bank_accounts").select("bank_name, account_number, account_holder_name").eq("is_active", true).order("display_order"),
    supabase.from("hotel_settings").select("hotel_name, payment_instructions").maybeSingle(),
  ]);

  const amount = Number(booking.payment_amount || booking.total_price);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const projectOrigin = supabaseUrl.replace(".supabase.co", ".lovable.app").replace("https://", "https://").replace(/^https:\/\/[^.]+/, "https://pomahguesthouse.com");
  const confirmUrl = `https://pomahguesthouse.com/confirm-payment/${booking.id}`;
  const invoicePdfUrl = `${supabaseUrl}/functions/v1/generate-invoice-pdf?booking_id=${booking.id}`;

  return {
    ok: true,
    invoice: {
      booking_code: booking.booking_code,
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone,
      room_name: booking.room?.name,
      check_in: booking.check_in,
      check_out: booking.check_out,
      total_nights: booking.total_nights,
      amount,
      amount_formatted: fmtRupiah(amount),
      payment_status: booking.payment_status,
      expires_at: booking.payment_expires_at,
      banks: (banks || []).map((b: any) => ({
        bank: b.bank_name,
        account_number: b.account_number,
        account_holder: b.account_holder_name,
      })),
      hotel_name: hotel?.hotel_name,
      payment_instructions: hotel?.payment_instructions,
      confirm_payment_url: confirmUrl,
      invoice_pdf_url: invoicePdfUrl,
    },
    summary: `Invoice ${booking.booking_code}: ${fmtRupiah(amount)}. Konfirmasi: ${confirmUrl}`,
  };
}

async function submitProof(supabase: any, body: PaymentRequest) {
  if (!body.booking_code) return { ok: false, error: "booking_code required" };
  if (!body.proof_url) return { ok: false, error: "proof_url required" };

  // Format validation
  if (body.proof_mime && !ALLOWED_MIME.includes(body.proof_mime.toLowerCase())) {
    return { ok: false, error: `Format file tidak valid: ${body.proof_mime}. Gunakan JPG, PNG, WEBP, atau PDF.` };
  }
  if (body.proof_size_bytes && body.proof_size_bytes > MAX_PROOF_SIZE) {
    return { ok: false, error: `Ukuran file ${(body.proof_size_bytes / 1024 / 1024).toFixed(1)}MB melebihi batas 10MB.` };
  }

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, booking_code, guest_name, guest_phone, total_price, payment_amount, payment_status")
    .eq("booking_code", body.booking_code)
    .maybeSingle();
  if (fetchErr || !booking) return { ok: false, error: "Booking tidak ditemukan" };

  const expectedAmount = Number(booking.payment_amount || booking.total_price);
  const amountMatches = body.declared_amount ? Math.abs(body.declared_amount - expectedAmount) < 1 : true;

  // Update booking → proof uploaded
  const { error: updateErr } = await supabase
    .from("bookings")
    .update({
      payment_proof_url: body.proof_url,
      payment_status: "proof_uploaded",
      remark: body.notes || booking.payment_status,
    })
    .eq("id", booking.id);
  if (updateErr) return { ok: false, error: `Gagal update booking: ${updateErr.message}` };

  // Notify managers via Fonnte (auto-confirm via manager flow already exists in whatsapp-webhook price-approval)
  const FONNTE_API_KEY = Deno.env.get("FONNTE_API_KEY");
  let notifiedCount = 0;
  if (FONNTE_API_KEY) {
    const { data: settings } = await supabase
      .from("hotel_settings")
      .select("whatsapp_manager_numbers, hotel_name")
      .maybeSingle();
    const managers: Array<{ phone: string; name: string }> = settings?.whatsapp_manager_numbers || [];
    const hotelName = settings?.hotel_name || "Hotel";

    const msg = `💰 *PEMBAYARAN MASUK*

📍 ${hotelName}
📝 Kode: ${booking.booking_code}
👤 Tamu: ${booking.guest_name}
📱 HP: ${booking.guest_phone || "-"}
💵 Nominal diharapkan: ${fmtRupiah(expectedAmount)}
${body.declared_amount ? `💵 Tamu menyatakan: ${fmtRupiah(body.declared_amount)} ${amountMatches ? "✅" : "⚠️ TIDAK COCOK"}` : ""}
🖼️ Bukti: ${body.proof_url}

⏰ ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}

_Balas *APPROVE ${booking.booking_code}* untuk konfirmasi, atau *REJECT ${booking.booking_code}* untuk tolak._`;

    for (const m of managers) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        const r = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: { Authorization: FONNTE_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ target: m.phone, message: msg }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        const j = await r.json();
        if (j.status) notifiedCount++;
      } catch (e) {
        console.error("notify failed", m.phone, e);
      }
    }
  }

  return {
    ok: true,
    validation: {
      format_valid: true,
      amount_matches: amountMatches,
      expected_amount: expectedAmount,
      declared_amount: body.declared_amount || null,
    },
    notified_managers: notifiedCount,
    booking_status: "proof_uploaded",
    summary: `Bukti diterima untuk ${booking.booking_code}. ${notifiedCount} manager dinotifikasi. Menunggu APPROVE manager.`,
  };
}

async function checkStatus(supabase: any, bookingCode: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_code, payment_status, payment_amount, total_price, payment_proof_url, status")
    .eq("booking_code", bookingCode)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Booking tidak ditemukan" };
  return {
    ok: true,
    status: {
      booking_code: data.booking_code,
      payment_status: data.payment_status,
      booking_status: data.status,
      amount: Number(data.payment_amount || data.total_price),
      has_proof: !!data.payment_proof_url,
    },
    summary: `${data.booking_code}: payment=${data.payment_status}, booking=${data.status}`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const provided = req.headers.get("x-internal-secret") || "";
  if (!INTERNAL_SECRET || provided !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as PaymentRequest;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result: any;
    switch (body.action) {
      case "generate_invoice":
        if (!body.booking_code) return new Response(JSON.stringify({ error: "booking_code required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        result = await generateInvoice(supabase, body.booking_code);
        break;
      case "submit_proof":
        result = await submitProof(supabase, body);
        break;
      case "check_status":
        if (!body.booking_code) return new Response(JSON.stringify({ error: "booking_code required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        result = await checkStatus(supabase, body.booking_code);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown action. Use: generate_invoice | submit_proof | check_status" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("payment-agent error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
