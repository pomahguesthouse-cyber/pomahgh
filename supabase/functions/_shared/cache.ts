/**
 * Shared memory cache for Edge Functions
 * Persists across warm invocations of the same function instance
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(options?: { maxSize?: number; defaultTTL?: number }) {
    this.maxSize = options?.maxSize ?? 100;
    this.defaultTTL = options?.defaultTTL ?? 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    // Cleanup if at max size
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate keys matching a pattern
   */
  invalidate(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Remove expired entries and oldest entries if over limit
   */
  private cleanup(): void {
    const now = Date.now();
    const entries: [string, number][] = [];

    // Remove expired and collect remaining
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      } else {
        entries.push([key, entry.expiresAt]);
      }
    }

    // If still over limit, remove oldest
    if (this.cache.size >= this.maxSize) {
      entries.sort((a, b) => a[1] - b[1]);
      const toRemove = Math.ceil(this.maxSize * 0.2); // Remove 20%
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
}

/**
 * Singleton cache instance
 */
export const sharedCache = new MemoryCache();

/**
 * Common cache keys
 */
export const CACHE_KEYS = {
  HOTEL_SETTINGS: 'hotel_settings',
  CHATBOT_SETTINGS: 'chatbot_settings',
  ROOMS: 'rooms',
  FACILITIES: 'facilities',
  KNOWLEDGE_BASE: 'knowledge_base',
  TRAINING_EXAMPLES: 'training_examples',
} as const;

/**
 * Common TTL values (in milliseconds)
 */
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  HOUR: 60 * 60 * 1000,      // 1 hour
} as const;

/**
 * Helper to get or load cached data
 */
export async function getOrLoad<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs?: number,
  forceRefresh = false
): Promise<T> {
  if (!forceRefresh) {
    const cached = sharedCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  const data = await loader();
  sharedCache.set(key, data, ttlMs);
  return data;
}
