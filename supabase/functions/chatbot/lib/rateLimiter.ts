// Simple in-memory sliding-window rate limiter (per edge isolate).
// NOTE: Backend doesn't have proper rate-limit primitives (Redis/Upstash).
// This is best-effort and does NOT defend against distributed attackers,
// but it's enough to curb casual spam from a single client/session.

const WINDOW_MS = 60_000; // 1 minute window
const MAX_PER_WINDOW = 15; // max requests per key per window
const BURST_WINDOW_MS = 5_000; // 5 second burst window
const MAX_PER_BURST = 5; // max requests per burst window

type Hit = { ts: number };
const buckets = new Map<string, Hit[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  reason?: string;
}

export function checkChatbotRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const burstCutoff = now - BURST_WINDOW_MS;

  let hits = buckets.get(key) || [];
  // Drop expired entries
  hits = hits.filter((h) => h.ts > cutoff);

  const burstCount = hits.filter((h) => h.ts > burstCutoff).length;
  if (burstCount >= MAX_PER_BURST) {
    buckets.set(key, hits);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(BURST_WINDOW_MS / 1000),
      reason: "burst",
    };
  }

  if (hits.length >= MAX_PER_WINDOW) {
    const oldest = hits[0]?.ts ?? now;
    buckets.set(key, hits);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
      reason: "window",
    };
  }

  hits.push({ ts: now });
  buckets.set(key, hits);

  // Periodic cleanup to avoid unbounded growth
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      const fresh = v.filter((h) => h.ts > cutoff);
      if (fresh.length === 0) buckets.delete(k);
      else buckets.set(k, fresh);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientKey(req: Request, body: Record<string, unknown> | null): string {
  const ipHeader =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "";
  const ip = ipHeader.split(",")[0]?.trim() || "unknown";

  const ctx = (body?.conversationContext ?? {}) as Record<string, unknown>;
  const sessionId =
    (ctx?.session_id as string | undefined) ||
    (ctx?.conversation_id as string | undefined) ||
    (body?.session_id as string | undefined) ||
    (body?.conversation_id as string | undefined) ||
    "";

  return sessionId ? `s:${sessionId}` : `ip:${ip}`;
}
