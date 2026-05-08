/**
 * Webhook deduplication & identical-message throttling.
 *
 * Two-layer architecture for cross-isolate / cold-start safety:
 *
 *   L1 — in-memory cache (per isolate)  — sub-millisecond, drops on cold start.
 *   L2 — Postgres `whatsapp_webhook_dedup` table — survives cold starts and
 *        works across isolates. Atomic INSERT … ON CONFLICT DO NOTHING is the
 *        primitive: if no row was inserted, another invocation already claimed
 *        the key → it's a duplicate.
 *
 * Solves two real-world issues:
 *
 * 1. **Webhook retries** — Fonnte retries delivery on a fixed cadence (~60s)
 *    when our function doesn't respond 200 fast enough. Without persistent
 *    dedup, retries that land on a fresh isolate would replay the message.
 *
 * 2. **Auto-sender / sticky retry** — Same text from guest repeatedly. After a
 *    recent identical reply, we suppress further responses.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const MESSAGE_ID_TTL_MS = 5 * 60 * 1000; // 5 minutes
const IDENTICAL_TEXT_TTL_MS = 90 * 1000; // 90 seconds
const MAX_LOCAL_ENTRIES = 1000;

// L1 (in-memory) — fast path
const seenKeys = new Map<string, number>(); // dedup_key -> expiresAt(ms)

function evictExpired(now: number): void {
  if (seenKeys.size < MAX_LOCAL_ENTRIES) return;
  for (const [k, exp] of seenKeys) {
    if (now > exp) seenKeys.delete(k);
  }
}

/** Stable, fast 32-bit hash for text → short key. Not cryptographic. */
function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Pull a message id from common Fonnte / WA webhook field names. */
export function extractMessageId(body: Record<string, unknown> | null): string | null {
  if (!body) return null;
  for (const key of ['id', 'messageId', 'message_id', 'msgId', 'msg_id']) {
    const v = body[key];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return null;
}

/**
 * Compute the dedup keys we want to claim for this incoming message.
 * Returns one or both depending on what's available.
 */
export function buildDedupKeys(args: {
  phone: string;
  messageId: string | null;
  normalizedText: string;
}): Array<{ key: string; reason: string; ttlMs: number }> {
  const keys: Array<{ key: string; reason: string; ttlMs: number }> = [];
  if (args.messageId) {
    keys.push({
      key: `mid:${args.messageId}`,
      reason: 'duplicate_message_id',
      ttlMs: MESSAGE_ID_TTL_MS,
    });
  }
  const text = args.normalizedText.trim().toLowerCase();
  if (text.length > 0) {
    keys.push({
      key: `txt:${args.phone}:${hashText(text)}`,
      reason: 'duplicate_identical_text',
      ttlMs: IDENTICAL_TEXT_TTL_MS,
    });
  }
  return keys;
}

/**
 * Atomically claim each dedup key in Postgres. If the row already exists and
 * has not expired, the message is a duplicate and we return its reason.
 *
 * Strategy: `INSERT … ON CONFLICT (dedup_key) DO UPDATE … WHERE expires_at < now()
 * RETURNING (xmax = 0) AS inserted`. The `xmax = 0` trick distinguishes a real
 * insert from an update of an expired row. If neither happened (no row
 * returned), another live row already exists → duplicate.
 */
export async function checkDuplicate(
  supabase: SupabaseClient,
  args: { phone: string; messageId: string | null; normalizedText: string },
): Promise<{ skip: true; reason: string } | { skip: false }> {
  const now = Date.now();
  const candidates = buildDedupKeys(args);
  if (candidates.length === 0) return { skip: false };

  for (const { key, reason, ttlMs } of candidates) {
    // L1 fast path
    const localExp = seenKeys.get(key);
    if (localExp && localExp > now) {
      return { skip: true, reason };
    }

    // L2 atomic claim
    const expiresAt = new Date(now + ttlMs).toISOString();
    try {
      const { data, error } = await supabase
        .from('whatsapp_webhook_dedup')
        .upsert(
          { dedup_key: key, phone_number: args.phone, expires_at: expiresAt },
          { onConflict: 'dedup_key', ignoreDuplicates: true },
        )
        .select('dedup_key');

      if (error) {
        console.warn(`[dedup] DB error claiming ${key}, failing open:`, error.message);
        seenKeys.set(key, now + ttlMs);
        continue;
      }

      // ignoreDuplicates: true → returns empty array if conflict (already claimed).
      // We must then check whether the existing row is still live or expired.
      if (!data || data.length === 0) {
        const { data: existing } = await supabase
          .from('whatsapp_webhook_dedup')
          .select('expires_at')
          .eq('dedup_key', key)
          .maybeSingle();
        if (existing && new Date(existing.expires_at).getTime() > now) {
          // Still live → duplicate
          seenKeys.set(key, new Date(existing.expires_at).getTime());
          return { skip: true, reason };
        }
        // Expired row exists. Refresh it (best effort).
        await supabase
          .from('whatsapp_webhook_dedup')
          .update({ expires_at: expiresAt, phone_number: args.phone })
          .eq('dedup_key', key);
      }

      seenKeys.set(key, now + ttlMs);
    } catch (err) {
      console.warn(`[dedup] Unexpected error claiming ${key}, failing open:`, err);
      seenKeys.set(key, now + ttlMs);
    }
  }

  evictExpired(now);

  // Opportunistic cleanup ~0.1% of the time. Bulk cleanup runs every 5 min via pg_cron;
  // this is just a safety net between cron ticks under heavy load.
  if (Math.random() < 0.001) {
    supabase.rpc('cleanup_whatsapp_webhook_dedup', { p_batch: 1000 }).then(
      () => {},
      (err: unknown) => console.warn('[dedup] cleanup rpc failed:', err),
    );
  }

  return { skip: false };
}

/** Test-only: clear in-memory L1 cache between tests. */
export function __resetDedupCache(): void {
  seenKeys.clear();
}
