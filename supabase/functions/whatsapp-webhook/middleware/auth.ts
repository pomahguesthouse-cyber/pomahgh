import { corsHeaders } from '../types.ts';

/**
 * Auth middleware: validate webhook token or Fonnte body structure.
 * Returns null if authorized, or an error Response if not.
 */
export async function validateWebhookAuth(req: Request): Promise<Response | null> {
  const expectedWebhookToken = Deno.env.get("WHATSAPP_WEBHOOK_TOKEN");
  if (!expectedWebhookToken) {
    console.error("WHATSAPP_WEBHOOK_TOKEN not configured");
    return new Response(JSON.stringify({ status: "error", reason: "webhook token not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const reqUrl = new URL(req.url);
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const providedWebhookToken =
    req.headers.get("x-webhook-token") ||
    req.headers.get("X-Webhook-Token") ||
    req.headers.get("x-fonnte-token") ||
    req.headers.get("apikey") ||
    bearerToken ||
    reqUrl.searchParams.get("token") ||
    reqUrl.searchParams.get("apikey");

  if (providedWebhookToken === expectedWebhookToken) return null;

  // Fallback: validate Fonnte body structure
  let bodyText = "";
  try {
    bodyText = await req.clone().text();
  } catch { /* ignore */ }

  const hasFonnteStructure = bodyText && (
    (bodyText.includes('"sender"') || bodyText.includes('"pengirim"')) &&
    (bodyText.includes('"message"') || bodyText.includes('"text"') || bodyText.includes('"pesan"'))
  );

  if (!hasFonnteStructure) {
    console.warn(`Unauthorized webhook request from ${req.headers.get('x-forwarded-for') || 'unknown IP'}`);
    return new Response(JSON.stringify({ status: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  console.log("Token not found, but request has valid Fonnte body structure — allowing");
  return null;
}
