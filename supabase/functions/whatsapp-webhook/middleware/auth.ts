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

  // 🔍 DIAGNOSTIC LOG — capture exactly what Fonnte sends
  const allHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    // Mask sensitive values but show length and first/last chars
    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token') || key.toLowerCase().includes('key')) {
      allHeaders[key] = value ? `[len=${value.length}] ${value.slice(0, 4)}...${value.slice(-4)}` : '';
    } else {
      allHeaders[key] = value;
    }
  });

  let bodyPreview = '';
  try {
    const cloned = req.clone();
    const text = await cloned.text();
    bodyPreview = text.slice(0, 500);
  } catch (_) {
    bodyPreview = '<unable to read body>';
  }

  const queryParams: Record<string, string> = {};
  reqUrl.searchParams.forEach((v, k) => {
    queryParams[k] = k.toLowerCase().includes('token') || k.toLowerCase().includes('key')
      ? `[len=${v.length}] ${v.slice(0, 4)}...${v.slice(-4)}`
      : v;
  });

  console.warn(`🔍 UNAUTHORIZED WEBHOOK DIAGNOSTIC`, JSON.stringify({
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    method: req.method,
    url: reqUrl.pathname,
    expected_token_length: expectedWebhookToken.length,
    expected_token_preview: `${expectedWebhookToken.slice(0, 4)}...${expectedWebhookToken.slice(-4)}`,
    provided_token_found: providedWebhookToken
      ? `[len=${providedWebhookToken.length}] ${providedWebhookToken.slice(0, 4)}...${providedWebhookToken.slice(-4)}`
      : 'NONE',
    query_params: queryParams,
    headers: allHeaders,
    body_preview: bodyPreview,
  }, null, 2));

  return new Response(JSON.stringify({ status: "unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
