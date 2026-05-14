/** Indonesian slang normalizer for better AI understanding.
 *  Patterns are loaded from whatsapp_slang_patterns table with a TTL cache,
 *  so admin can manage entries without redeploy. */
import type { SupabaseClient } from "../types.ts";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface SlangCache {
  map: Record<string, string>;
  regex: RegExp | null;
  fetchedAt: number;
}

let cache: SlangCache | null = null;
let inflight: Promise<SlangCache> | null = null;

function buildRegex(map: Record<string, string>): RegExp | null {
  const keys = Object.keys(map);
  if (keys.length === 0) return null;
  const escaped = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
}

async function loadPatterns(supabase: SupabaseClient): Promise<SlangCache> {
  const { data, error } = await supabase
    .from("whatsapp_slang_patterns")
    .select("slang, normalized")
    .eq("is_active", true);

  if (error) {
    console.error("[slang] failed to load patterns:", error.message);
    return { map: {}, regex: null, fetchedAt: Date.now() };
  }

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.slang && row.normalized) {
      map[String(row.slang).toLowerCase()] = String(row.normalized);
    }
  }

  return { map, regex: buildRegex(map), fetchedAt: Date.now() };
}

async function getCache(supabase: SupabaseClient): Promise<SlangCache> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = loadPatterns(supabase)
    .then((result) => {
      cache = result;
      return result;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function normalizeIndonesianMessage(
  msg: string,
  supabase: SupabaseClient,
): Promise<string> {
  const { map, regex } = await getCache(supabase);
  const lowered = msg.toLowerCase();
  if (!regex) return lowered;
  return lowered.replace(regex, (match) => map[match.toLowerCase()] || match);
}

/** Test/admin helper: force the next call to refetch from DB. */
export function invalidateSlangCache(): void {
  cache = null;
}
