/**
 * Notify guest via WhatsApp when admin approves or rejects payment.
 * Uses templates from invoice_templates table.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { format } from "https://esm.sh/date-fns@3.6.0";
import { id as idLocale } from "https://esm.sh/date-fns@3.6.0/locale/id";
import { verifyAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    const body = await auth.response.text();
    return new Response(body, { status: auth.response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { booking_id, decision, reason } = await req.json();
    if (!booking_id || !decision) {
      return new Response(JSON.stringify({ error: "booking_id & decision required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: booking }, { data: template }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, booking_code, guest_name, guest_phone, total_price, check_in")
        .eq("id", booking_id)
        .single(),
      supabase
        .from("invoice_templates")
        .select("notify_guest_on_approve, notify_guest_on_reject, approve_message_template, reject_message_template")
        .limit(1)
        .maybeSingle(),
    ]);

    if (!booking) throw new Error("Booking not found");
    if (!booking.guest_phone) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enabled = decision === "approve"
      ? (template?.notify_guest_on_approve ?? true)
      : (template?.notify_guest_on_reject ?? true);

    if (!enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "notification_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tpl = decision === "approve"
      ? (template?.approve_message_template ?? "✅ Halo {{guest_name}}, pembayaran booking {{booking_code}} sudah kami konfirmasi LUNAS. Terima kasih!")
      : (template?.reject_message_template ?? "⚠️ Halo {{guest_name}}, bukti pembayaran booking {{booking_code}} belum dapat dikonfirmasi. Alasan: {{reason}}");

    const checkInLabel = format(new Date(booking.check_in), "d MMMM yyyy", { locale: idLocale });

    const message = tpl
      .replaceAll("{{guest_name}}", booking.guest_name)
      .replaceAll("{{booking_code}}", booking.booking_code)
      .replaceAll("{{check_in_date}}", checkInLabel)
      .replaceAll("{{total_price}}", formatRp(booking.total_price))
      .replaceAll("{{reason}}", reason || "—");

    const apiKey = Deno.env.get("FONNTE_API_KEY");
    if (!apiKey) throw new Error("FONNTE_API_KEY missing");

    const resp = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ target: booking.guest_phone, message, countryCode: "62" }),
    });

    const data = await resp.json();
    return new Response(JSON.stringify({ success: resp.ok && data.status !== false, raw: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-payment-decision error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
