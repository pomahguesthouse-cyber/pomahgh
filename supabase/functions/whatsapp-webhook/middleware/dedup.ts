/**
 * Webhook deduplication & identical-message throttling.
 *
 * Solves two real-world issues observed in production logs:
 *
 * 1. **Webhook retries** — Fonnte (and most WA webhook providers) retry delivery
 *    on a fixed cadence (~60s) when our function does not respond 200 fast
 *    enough or returns an error. Without dedup, the same message_id is processed
 *    repeatedly → AI replies repeatedly → user receives spam.
 *
 * 2. **Auto-sender / sticky retry from guest side** — Some clients send the
 *    exact same text periodically. AI shouldn't keep responding with the same
 *    template. After a recent identical reply, we suppress further responses.
 *
 * Implementation: in-memory LRU per isolate. This is "good enough" because
 * Fonnte retries hit the same warm isolate within seconds in practice, and
 * the existing per-phone rate limiter (rateLimiter.ts) catches cross-isolate
 * bursts via the database.
 */

const MESSAGE_ID_TTL_MS = 5 * 60 * 1000; // 5 minutes
const IDENTICAL_TEXT_TTL_MS = 90 * 1000; // 90 seconds
const MAX_ENTRIES = 1000;

const seenMessageIds = new Map<string, number>(); // message_id -> expiresAt
const lastUserText = new Map<string, { text: string; expiresAt: number }>(); // phone -> last text

function evictExpired(map: Map<string, unknown>, now: number): void {
  if (map.size < MAX_ENTRIES) return;
  for (const [k, v] of map) {
    const exp = typeof v === 'number' ? v : (v as { expiresAt: number }).expiresAt;
    if (now > exp) map.delete(k);
  }
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
 * Check if this incoming message should be skipped.
 *
 * @returns reason string if duplicate (caller should respond 200 + skip), or null to proceed.
 */
export function checkDuplicate(args: {
  phone: string;
  messageId: string | null;
  normalizedText: string;
}): { skip: true; reason: string } | { skip: false } {
  const now = Date.now();

  // 1. Same message_id seen recently → webhook retry
  if (args.messageId) {
    const exp = seenMessageIds.get(args.messageId);
    if (exp && exp > now) {
      return { skip: true, reason: 'duplicate_message_id' };
    }
    seenMessageIds.set(args.messageId, now + MESSAGE_ID_TTL_MS);
    evictExpired(seenMessageIds, now);
  }

  // 2. Identical text from same phone within window → auto-sender / sticky retry
  const text = args.normalizedText.trim().toLowerCase();
  if (text.length > 0) {
    const last = lastUserText.get(args.phone);
    if (last && last.expiresAt > now && last.text === text) {
      return { skip: true, reason: 'duplicate_identical_text' };
    }
    lastUserText.set(args.phone, { text, expiresAt: now + IDENTICAL_TEXT_TTL_MS });
    evictExpired(lastUserText as unknown as Map<string, unknown>, now);
  }

  return { skip: false };
}

/** Test-only: clear in-memory caches between tests. */
export function __resetDedupCache(): void {
  seenMessageIds.clear();
  lastUserText.clear();
}
