/**
 * Shared cron/internal authentication helper.
 * Verifies that the request includes a valid SUPABASE_SERVICE_ROLE_KEY
 * in the Authorization header (Bearer token) or x-service-key header.
 *
 * Use this for internal/cron edge functions that should NOT be callable publicly.
 */

export function verifyServiceRole(req: Request): { ok: true } | { ok: false; response: Response } {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const xServiceKey = req.headers.get("x-service-key") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (bearer === serviceKey || xServiceKey === serviceKey) {
    return { ok: true };
  }

  return {
    ok: false,
    response: new Response(
      JSON.stringify({ error: "Unauthorized: valid service role key required" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    ),
  };
}
