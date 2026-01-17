/**
 * Memory Cache Service for Admin Chatbot Edge Function
 * 
 * Mirrors the guest chatbot cache implementation for consistency.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 50; // Smaller for admin (fewer concurrent users)

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs || this.defaultTTL),
      createdAt: Date.now()
    });
  }

  invalidate(pattern: string): number {
    let invalidated = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    
    if (this.cache.size >= this.maxSize) {
      const entries = [...this.cache.entries()]
        .sort((a, b) => a[1].createdAt - b[1].createdAt);
      const toRemove = Math.ceil(this.maxSize * 0.2);
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
}

// Singleton instance
export const adminCache = new MemoryCache();

// Cache keys
export const ADMIN_CACHE_KEYS = {
  HOTEL_SETTINGS: 'admin_hotel_settings',
  CHATBOT_SETTINGS: 'admin_chatbot_settings',
  KNOWLEDGE_BASE: 'admin_knowledge_base',
  TRAINING_EXAMPLES: 'admin_training_examples'
} as const;

// TTL configurations
export const ADMIN_CACHE_TTL = {
  HOTEL_SETTINGS: 10 * 60 * 1000,    // 10 minutes
  CHATBOT_SETTINGS: 5 * 60 * 1000,   // 5 minutes
  KNOWLEDGE_BASE: 10 * 60 * 1000,    // 10 minutes
  TRAINING_EXAMPLES: 10 * 60 * 1000  // 10 minutes
} as const;

/**
 * Helper to get or set cache with async loader
 */
export async function getOrLoadAdmin<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs?: number,
  forceRefresh = false
): Promise<T> {
  if (!forceRefresh) {
    const cached = adminCache.get<T>(key);
    if (cached !== null) {
      console.log(`📦 Admin Cache HIT: ${key}`);
      return cached;
    }
  }

  console.log(`🔄 Admin Cache MISS: ${key}`);
  const data = await loader();
  adminCache.set(key, data, ttlMs);
  return data;
}
