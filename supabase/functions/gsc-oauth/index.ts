import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Get OAuth URLs
    if (action === "init") {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gsc-oauth?action=callback`;
      
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId ?? "");
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/webmasters.readonly");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle OAuth callback
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        console.error("OAuth error:", error);
        return new Response(
          `<html><body><script>window.opener.postMessage({ type: 'gsc-oauth-error', error: '${error}' }, '*'); window.close();</script></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      if (!code) {
        return new Response(
          `<html><body><script>window.opener.postMessage({ type: 'gsc-oauth-error', error: 'No code received' }, '*'); window.close();</script></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
          code,
          grant_type: "authorization_code",
          redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/gsc-oauth?action=callback`,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("Token exchange error:", tokenData);
        return new Response(
          `<html><body><script>window.opener.postMessage({ type: 'gsc-oauth-error', error: '${tokenData.error_description || tokenData.error}' }, '*'); window.close();</script></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      // Get list of sites from Search Console
      const sitesResponse = await fetch(
        "https://www.googleapis.com/webmasters/v3/sites",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );
      const sitesData = await sitesResponse.json();

      // Get the first verified site or use empty string
      const siteUrl = sitesData.siteEntry?.[0]?.siteUrl || "";

      // Calculate expiry time
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Store credentials in database
      const { error: dbError } = await supabase
        .from("search_console_credentials")
        .upsert({
          id: "default",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt.toISOString(),
          site_url: siteUrl,
          is_connected: true,
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error("Database error:", dbError);
        return new Response(
          `<html><body><script>window.opener.postMessage({ type: 'gsc-oauth-error', error: 'Failed to save credentials' }, '*'); window.close();</script></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      console.log("OAuth successful, site URL:", siteUrl);

      return new Response(
        `<html><body><script>window.opener.postMessage({ type: 'gsc-oauth-success', siteUrl: '${siteUrl}' }, '*'); window.close();</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Check connection status
    if (action === "status") {
      const { data, error } = await supabase
        .from("search_console_credentials")
        .select("*")
        .eq("id", "default")
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          connected: data.is_connected,
          siteUrl: data.site_url,
          expiresAt: data.expires_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Disconnect
    if (action === "disconnect") {
      await supabase
        .from("search_console_credentials")
        .update({
          is_connected: false,
          access_token: null,
          refresh_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "default");

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
