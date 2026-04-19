/**
 * OCR Payment Proof Test (Admin)
 *
 * Lets admins upload a payment-proof image and receive structured extraction
 * (amount, sender, bank, date, reference) without going through the WhatsApp
 * pipeline. Uses the same Gemini Vision prompt as the production handler.
 */
import { verifyAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentProofExtraction {
  is_payment_proof: boolean;
  confidence: "high" | "medium" | "low";
  amount: number | null;
  sender_name: string | null;
  bank_name: string | null;
  transfer_date: string | null;
  reference_number: string | null;
  notes: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    const body = await auth.response.text();
    return new Response(body, { status: auth.response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { image_data_url } = await req.json();

    if (!image_data_url || typeof image_data_url !== "string") {
      return new Response(
        JSON.stringify({ error: "image_data_url required (base64 data URL)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: [
              "You are an OCR + financial parser specialized in Indonesian bank transfer & e-wallet receipts",
              "(BCA, BRI, Mandiri, BNI, BSI, CIMB, OVO, GoPay, DANA, ShopeePay, LinkAja, QRIS, etc.).",
              "",
              "From the uploaded payment proof image, extract:",
              "  - Transfer amount (in Rupiah, integer, no separators)",
              '  - Transaction date (Indonesian format: "DD MMM YYYY")',
              "  - Sender name (the person/account who SENT the money)",
              "  - Bank name (or e-wallet name)",
              "  - Reference number (transaction ID / kode unik / no. referensi if visible)",
              "",
              "Rules:",
              "  - If a field is unclear or not visible, return null for that field.",
              "  - Set is_payment_proof=false if image is not a transfer/payment receipt.",
              '  - Set confidence = "high" only when amount + sender + bank are all clearly readable.',
              "  - Return data ONLY via the extract_payment_proof function call.",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Ekstrak data bukti transfer dari gambar berikut." },
              { type: "image_url", image_url: { url: image_data_url } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_payment_proof",
            description: "Return structured extraction of a payment proof image.",
            parameters: {
              type: "object",
              properties: {
                is_payment_proof: { type: "boolean" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
                amount: { type: ["number", "null"] },
                sender_name: { type: ["string", "null"] },
                bank_name: { type: ["string", "null"] },
                transfer_date: { type: ["string", "null"] },
                reference_number: { type: ["string", "null"] },
                notes: { type: ["string", "null"] },
              },
              required: ["is_payment_proof", "confidence"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_payment_proof" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit (Lovable AI). Coba lagi sebentar." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Kredit Lovable AI habis. Top-up workspace settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Vision API error", resp.status, txt);
      return new Response(JSON.stringify({ error: `Vision API error ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Model tidak mengembalikan hasil terstruktur" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extraction = JSON.parse(toolCall.function.arguments) as PaymentProofExtraction;

    return new Response(JSON.stringify({ extraction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR test error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
