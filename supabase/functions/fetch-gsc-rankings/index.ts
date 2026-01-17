import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("Token refresh error:", data);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Failed to refresh token:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get request body
    const body = await req.json().catch(() => ({}));
    const startDate = body.startDate || new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = body.endDate || new Date().toISOString().split("T")[0];

    // Get credentials
    const { data: credentials, error: credError } = await supabase
      .from("search_console_credentials")
      .select("*")
      .eq("id", "default")
      .single();

    if (credError || !credentials) {
      console.error("No credentials found:", credError);
      return new Response(
        JSON.stringify({ error: "Not connected to Google Search Console" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!credentials.is_connected) {
      return new Response(
        JSON.stringify({ error: "Google Search Console is disconnected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = credentials.access_token;
    const expiresAt = new Date(credentials.expires_at);

    // Refresh token if expired
    if (expiresAt <= new Date()) {
      console.log("Token expired, refreshing...");
      const newTokens = await refreshAccessToken(
        credentials.refresh_token,
        Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
        Deno.env.get("GOOGLE_CLIENT_SECRET") ?? ""
      );

      if (!newTokens) {
        return new Response(
          JSON.stringify({ error: "Failed to refresh access token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      accessToken = newTokens.access_token;
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));

      await supabase
        .from("search_console_credentials")
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", "default");
    }

    // Fetch data from Search Console API
    const siteUrl = credentials.site_url;
    console.log(`Fetching rankings for ${siteUrl} from ${startDate} to ${endDate}`);

    const gscResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["query", "page", "date"],
          rowLimit: 1000,
        }),
      }
    );

    const gscData = await gscResponse.json();

    if (gscData.error) {
      console.error("GSC API error:", gscData.error);
      return new Response(
        JSON.stringify({ error: gscData.error.message || "Failed to fetch data from GSC" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear existing data for the date range
    await supabase
      .from("search_console_rankings")
      .delete()
      .gte("date", startDate)
      .lte("date", endDate);

    // Insert new data
    const rows = gscData.rows || [];
    console.log(`Got ${rows.length} rows from GSC API`);

    if (rows.length > 0) {
      const insertData = rows.map((row: {
        keys: string[];
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
      }) => ({
        query: row.keys[0],
        page_url: row.keys[1],
        date: row.keys[2],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }));

      // Insert in batches of 100
      for (let i = 0; i < insertData.length; i += 100) {
        const batch = insertData.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from("search_console_rankings")
          .insert(batch);

        if (insertError) {
          console.error("Insert error:", insertError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rowsImported: rows.length,
        dateRange: { startDate, endDate },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
