const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;
const CLEANUP_INTERVAL = 30 * 1000;
let lastCleanup = 0;

export function checkRateLimit(phone: string): boolean {
  const now = Date.now();

  // Clean expired entries periodically or when map grows large
  if (now - lastCleanup > CLEANUP_INTERVAL || rateLimitMap.size > 500) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
    lastCleanup = now;
  }

  const entry = rateLimitMap.get(phone);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}
