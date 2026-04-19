/**
 * Shared admin auth helper.
 * Verifies a logged-in user with role in user_roles table = 'admin' or 'super_admin'.
 *
 * Use this for edge functions that should ONLY be callable by admin users from the frontend.
 * Requires verify_jwt = true in supabase/config.toml so JWT is auto-validated by the runtime.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function verifyAdmin(req: Request): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Unauthorized: missing Bearer token" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate user with anon client + user JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  // Check role with service client (bypass RLS)
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: roles, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);

  if (roleError) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Failed to verify role" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  const allowed = (roles ?? []).some((r) =>
    ["admin", "super_admin"].includes(String(r.role)),
  );

  if (!allowed) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  return { ok: true, userId: userData.user.id };
}
