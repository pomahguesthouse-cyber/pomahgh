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

  let parsedBody: Record<string, unknown> | null = null;
  let bodyPreview = '';
  try {
    const cloned = req.clone();
    const contentType = cloned.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      parsedBody = await cloned.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await cloned.formData();
      parsedBody = Object.fromEntries(formData.entries());
    } else {
      const text = await cloned.text();
      bodyPreview = text.slice(0, 500);
      if (text.trim()) {
        try {
          parsedBody = JSON.parse(text);
        } catch {
          parsedBody = Object.fromEntries(new URLSearchParams(text).entries());
        }
      }
    }

    if (!bodyPreview && parsedBody) {
      bodyPreview = JSON.stringify(parsedBody).slice(0, 500);
    }
  } catch (_) {
    bodyPreview = '<unable to read body>';
  }

  const sender = typeof parsedBody?.sender === 'string'
    ? parsedBody.sender
    : typeof parsedBody?.pengirim === 'string'
      ? parsedBody.pengirim
      : null;
  const message = typeof parsedBody?.message === 'string'
    ? parsedBody.message
    : typeof parsedBody?.pesan === 'string'
      ? parsedBody.pesan
      : null;
  const device = typeof parsedBody?.device === 'string' ? parsedBody.device : null;
  const messageType = typeof parsedBody?.type === 'string' ? parsedBody.type : null;
  const mediaUrl = typeof parsedBody?.url === 'string' ? parsedBody.url : null;
  // Accept Fonnte body signature for text OR media messages (image/video/document have empty `message`)
  const hasFonnteBodySignature = Boolean(
    sender && device && (message || messageType || mediaUrl)
  );

  if (!providedWebhookToken && hasFonnteBodySignature) {
    console.log(`Authorized webhook via Fonnte body signature for ${sender} (type=${messageType || 'text'})`);
    return null;
  }

  // 🔍 DIAGNOSTIC LOG — capture exactly what Fonnte sends
  const allHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token') || key.toLowerCase().includes('key')) {
      allHeaders[key] = value ? `[len=${value.length}] ${value.slice(0, 4)}...${value.slice(-4)}` : '';
    } else {
      allHeaders[key] = value;
    }
  });

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
    has_fonnte_body_signature: hasFonnteBodySignature,
    query_params: queryParams,
    headers: allHeaders,
    body_preview: bodyPreview,
  }, null, 2));

  return new Response(JSON.stringify({ status: "unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
