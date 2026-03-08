import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// DOKU payment methods list (static - DOKU doesn't have a dynamic get-methods API like Duitku)
const DOKU_PAYMENT_METHODS = [
  { code: "VIRTUAL_ACCOUNT_BCA", name: "BCA Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BANK_MANDIRI", name: "Mandiri Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BRI", name: "BRI Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BNI", name: "BNI Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_PERMATA", name: "Permata Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI", name: "BSI Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_DOKU", name: "DOKU Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BNC", name: "BNC Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BTN", name: "BTN Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BANK_DANAMON", name: "Danamon Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "VIRTUAL_ACCOUNT_BANK_CIMB", name: "CIMB Virtual Account", image: "", fee: 0, category: "Virtual Account" },
  { code: "QRIS", name: "QRIS", image: "", fee: 0, category: "QRIS" },
  { code: "EMONEY_OVO", name: "OVO", image: "", fee: 0, category: "E-Wallet" },
  { code: "EMONEY_DANA", name: "DANA", image: "", fee: 0, category: "E-Wallet" },
  { code: "EMONEY_SHOPEEPAY", name: "ShopeePay", image: "", fee: 0, category: "E-Wallet" },
  { code: "EMONEY_LINKAJA", name: "LinkAja", image: "", fee: 0, category: "E-Wallet" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valid amount is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DOKU doesn't have a dynamic payment methods API
    // Return the static list of supported methods
    const methods = DOKU_PAYMENT_METHODS.map(m => ({
      code: m.code,
      name: m.name,
      image: m.image,
      fee: m.fee,
    }));

    return new Response(
      JSON.stringify({ success: true, methods }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get payment methods error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
