import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { normalizeKeyword } from "../_shared/seoScoring.ts";

/**
 * Riset keyword:
 * - source=manual: simpan list keyword dari admin
 * - source=google_suggest: panggil Google Suggest untuk seed (+ a..z) dan simpan unique
 */

interface ReqBody {
  source: "manual" | "google_suggest";
  seed?: string;
  keywords?: string[];
  expandAlphabet?: boolean;
}

const fetchSuggest = async (q: string): Promise<string[]> => {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=id&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1] as string[];
    }
    return [];
  } catch (err) {
    console.warn("[seo-agent-keywords] suggest fetch failed:", err);
    return [];
  }
};

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: require admin user JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdminData } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    const collected: { keyword: string; seed?: string }[] = [];

    if (body.source === "manual") {
      if (!Array.isArray(body.keywords) || body.keywords.length === 0) {
        return new Response(JSON.stringify({ error: "keywords array required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      body.keywords.forEach((k) => collected.push({ keyword: k }));
    } else if (body.source === "google_suggest") {
      const seed = (body.seed ?? "").trim();
      if (!seed) {
        return new Response(JSON.stringify({ error: "seed required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const queries = [seed];
      if (body.expandAlphabet !== false) {
        for (let i = 0; i < 26; i++) {
          queries.push(`${seed} ${String.fromCharCode(97 + i)}`);
        }
      }
      for (const q of queries) {
        const sugs = await fetchSuggest(q);
        sugs.forEach((s) => collected.push({ keyword: s, seed }));
      }
    } else {
      return new Response(JSON.stringify({ error: "invalid source" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedupe + insert with onConflict on normalized_keyword
    const seen = new Set<string>();
    const rows = collected
      .map((c) => {
        const norm = normalizeKeyword(c.keyword);
        if (!norm || seen.has(norm)) return null;
        seen.add(norm);
        return {
          keyword: c.keyword.trim(),
          normalized_keyword: norm,
          source: body.source,
          seed_keyword: c.seed ?? null,
          status: "new",
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    if (rows.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error } = await supabase
      .from("seo_keywords")
      .upsert(rows, { onConflict: "normalized_keyword", ignoreDuplicates: true })
      .select("id");

    if (error) throw error;

    await supabase.from("seo_agent_runs").insert({
      step: "research",
      status: "success",
      payload: { source: body.source, requested: collected.length, inserted: inserted?.length ?? 0 },
    });

    return new Response(
      JSON.stringify({ inserted: inserted?.length ?? 0, total_seen: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[seo-agent-keywords] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});