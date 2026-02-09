import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { md5 } from "../_shared/md5.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const merchantCode = Deno.env.get("DUITKU_MERCHANT_CODE")!;
    const apiKey = Deno.env.get("DUITKU_API_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse callback - Duitku sends form-urlencoded or JSON
    let callbackData: Record<string, string>;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      callbackData = {};
      formData.forEach((value, key) => {
        callbackData[key] = value.toString();
      });
    } else {
      callbackData = await req.json();
    }

    console.log("Duitku callback received:", JSON.stringify(callbackData));

    const { merchantOrderId, amount, resultCode, reference, signature: receivedSignature } = callbackData;

    // Validate signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
    const expectedSignature = await md5(merchantCode + amount + merchantOrderId + apiKey);

    if (receivedSignature !== expectedSignature) {
      console.error("Invalid signature!", { received: receivedSignature, expected: expectedSignature });
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let status = "pending";
    if (resultCode === "00") status = "paid";
    else if (resultCode === "01") status = "pending";
    else status = "failed";

    const { data: txn, error: txnError } = await supabase
      .from("payment_transactions")
      .update({
        status,
        duitku_reference: reference,
        callback_data: callbackData,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      })
      .eq("merchant_order_id", merchantOrderId)
      .select("booking_id, amount")
      .single();

    if (txnError) console.error("Failed to update transaction:", txnError);

    if (status === "paid" && txn) {
      await supabase
        .from("bookings")
        .update({ payment_status: "paid", payment_amount: txn.amount })
        .eq("id", txn.booking_id);

      // Notify managers
      try {
        const { data: booking } = await supabase
          .from("bookings")
          .select("booking_code, guest_name, total_price, rooms(name)")
          .eq("id", txn.booking_id)
          .single();

        if (booking) {
          const room = booking.rooms as unknown as { name: string } | null;
          const { data: settings } = await supabase
            .from("hotel_settings")
            .select("whatsapp_manager_numbers")
            .single();

          const managerNumbers = (settings?.whatsapp_manager_numbers as Array<{ phone: string; name: string }>) || [];

          for (const manager of managerNumbers) {
            const message = `💰 *Pembayaran Diterima!*\n\nBooking: ${booking.booking_code}\nTamu: ${booking.guest_name}\nKamar: ${room?.name || '-'}\nTotal: Rp ${Number(txn.amount).toLocaleString('id-ID')}\nMetode: Duitku Online Payment\n\n✅ Pembayaran telah dikonfirmasi otomatis.`;
            await supabase.functions.invoke("send-whatsapp", { body: { phone: manager.phone, message } });
          }
        }
      } catch (e) {
        console.error("Failed to notify managers:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
