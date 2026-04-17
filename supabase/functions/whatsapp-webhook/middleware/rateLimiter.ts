import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

// In-memory cache as fast-path (per-isolate), DB as source of truth
const localCache = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(supabase: SupabaseClient, phone: string): Promise<boolean> {
  const now = Date.now();

  // Fast-path: check local cache first (avoids DB call if clearly under limit)
  const cached = localCache.get(phone);
  if (cached && now < cached.resetAt && cached.count >= RATE_LIMIT_MAX) {
    return false;
  }

  try {
    const windowStart = new Date(now - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

    // Count recent messages from this phone in the DB
    const { count, error } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_phone", phone)
      .gte("created_at", windowStart);

    if (error) {
      console.warn("[RateLimit] DB query failed, falling back to allow:", error.message);
      return true; // Fail open on DB error
    }

    const messageCount = count ?? 0;

    // Update local cache
    localCache.set(phone, {
      count: messageCount,
      resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000,
    });

    // Clean local cache periodically
    if (localCache.size > 500) {
      for (const [k, v] of localCache) {
        if (now > v.resetAt) localCache.delete(k);
      }
    }

    return messageCount < RATE_LIMIT_MAX;
  } catch (err) {
    console.warn("[RateLimit] Unexpected error, allowing request:", err);
    return true; // Fail open
  }
}
