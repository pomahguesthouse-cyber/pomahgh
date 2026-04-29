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
  // New combined format (used by admin UI)
  seeds?: string[];
  manual?: string[];
  expandAlphabet?: boolean;
  // Legacy single-source format (kept for backward compatibility)
  source?: "manual" | "google_suggest";
  seed?: string;
  keywords?: string[];
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

    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const collected: { keyword: string; seed?: string; source: string }[] = [];

    // Resolve seeds: explicit body.seeds, legacy body.seed, or fallback to settings.seed_keywords
    let seeds: string[] = [];
    if (Array.isArray(body.seeds) && body.seeds.length > 0) {
      seeds = body.seeds.filter((s) => typeof s === "string" && s.trim().length > 0);
    } else if (typeof body.seed === "string" && body.seed.trim()) {
      seeds = [body.seed.trim()];
    } else {
      const { data: settings } = await supabase
        .from("seo_agent_settings")
        .select("seed_keywords")
        .limit(1)
        .maybeSingle();
      const settingsSeeds = (settings?.seed_keywords ?? []) as string[];
      seeds = settingsSeeds.filter((s) => typeof s === "string" && s.trim().length > 0);
    }

    // Manual list: body.manual or legacy body.keywords
    const manualList: string[] = Array.isArray(body.manual)
      ? body.manual
      : Array.isArray(body.keywords)
      ? body.keywords
      : [];
    manualList
      .map((k) => (typeof k === "string" ? k.trim() : ""))
      .filter((k) => k.length > 0)
      .forEach((k) => collected.push({ keyword: k, source: "manual" }));

    // Google Suggest expansion for each seed
    for (const seed of seeds) {
      const queries = [seed];
      if (body.expandAlphabet !== false) {
        for (let i = 0; i < 26; i++) {
          queries.push(`${seed} ${String.fromCharCode(97 + i)}`);
        }
      }
      for (const q of queries) {
        const sugs = await fetchSuggest(q);
        sugs.forEach((s) => collected.push({ keyword: s, seed, source: "google_suggest" }));
      }
    }

    if (collected.length === 0) {
      return new Response(
        JSON.stringify({ inserted: 0, skipped: 0, error: "Tidak ada seed atau manual keyword. Tambahkan seed di Settings atau isi field di atas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
          source: c.source,
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
      payload: {
        seeds,
        manual_count: manualList.length,
        requested: collected.length,
        inserted: inserted?.length ?? 0,
      },
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