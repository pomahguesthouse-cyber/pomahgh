// DOKU Signature Generation Utility
// Used for DOKU Checkout API authentication

export async function generateDigest(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  return base64Digest;
}

export async function generateSignature(
  clientId: string,
  requestId: string,
  requestTimestamp: string,
  requestTarget: string,
  digest: string,
  secretKey: string
): Promise<string> {
  const componentSignature =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${requestTimestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(componentSignature)
  );

  const base64Signature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  return `HMACSHA256=${base64Signature}`;
}

export function getDokuBaseUrl(env: string = "production"): string {
  return env === "sandbox"
    ? "https://api-sandbox.doku.com"
    : "https://api.doku.com";
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function getTimestamp(): string {
  return new Date().toISOString();
}

export async function buildDokuHeaders(
  clientId: string,
  secretKey: string,
  requestTarget: string,
  body: string,
  env: string = "production"
): Promise<{ headers: Record<string, string>; baseUrl: string }> {
  const requestId = generateRequestId();
  const requestTimestamp = getTimestamp();
  const digest = await generateDigest(body);
  const signature = await generateSignature(
    clientId,
    requestId,
    requestTimestamp,
    requestTarget,
    digest,
    secretKey
  );

  return {
    headers: {
      "Client-Id": clientId,
      "Request-Id": requestId,
      "Request-Timestamp": requestTimestamp,
      "Signature": signature,
      "Content-Type": "application/json",
    },
    baseUrl: getDokuBaseUrl(env),
  };
}
