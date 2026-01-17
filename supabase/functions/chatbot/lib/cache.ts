/**
 * Memory Cache Service for Edge Functions
 * 
 * Deno edge functions maintain memory across warm instances,
 * enabling efficient caching without external dependencies.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 100; // Maximum entries to prevent memory bloat

  /**
   * Get cached value if exists and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.size--;
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set cache value with optional TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    // Cleanup old entries if at max size
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    const isNew = !this.cache.has(key);
    
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs || this.defaultTTL),
      createdAt: Date.now()
    });

    if (isNew) {
      this.stats.size++;
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
        this.stats.size--;
      }
    }
    
    return invalidated;
  }

  /**
   * Invalidate specific key
   */
  delete(key: string): boolean {
    const existed = this.cache.has(key);
    if (existed) {
      this.cache.delete(key);
      this.stats.size--;
    }
    return existed;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    this.stats.size = this.cache.size;
    
    // If still at max, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const entries = [...this.cache.entries()]
        .sort((a, b) => a[1].createdAt - b[1].createdAt);
      
      const toRemove = Math.ceil(this.maxSize * 0.2); // Remove oldest 20%
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
    };
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.size--;
      return false;
    }
    return true;
  }
}

// Singleton instance - persists across warm function invocations
export const cache = new MemoryCache();

// Cache key constants
export const CACHE_KEYS = {
  HOTEL_DATA: 'hotel_data',
  CHATBOT_SETTINGS: 'chatbot_settings',
  KNOWLEDGE_BASE: 'knowledge_base',
  TRAINING_EXAMPLES: 'training_examples',
  ROOMS: 'rooms',
  FACILITIES: 'facilities',
  ADDONS: 'addons'
} as const;

// TTL configurations (in milliseconds)
export const CACHE_TTL = {
  HOTEL_DATA: 10 * 60 * 1000,       // 10 minutes - rooms, settings change infrequently
  CHATBOT_SETTINGS: 5 * 60 * 1000,  // 5 minutes - persona settings
  KNOWLEDGE_BASE: 15 * 60 * 1000,   // 15 minutes - rarely changes
  TRAINING_EXAMPLES: 15 * 60 * 1000, // 15 minutes - rarely changes
  ROOMS: 10 * 60 * 1000,            // 10 minutes
  FACILITIES: 30 * 60 * 1000,       // 30 minutes - very stable
  ADDONS: 15 * 60 * 1000            // 15 minutes
} as const;

/**
 * Helper to get or set cache with async loader
 */
export async function getOrLoad<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs?: number,
  forceRefresh = false
): Promise<T> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = cache.get<T>(key);
    if (cached !== null) {
      console.log(`📦 Cache HIT: ${key}`);
      return cached;
    }
  }

  console.log(`🔄 Cache MISS: ${key} - loading fresh data`);
  
  // Load fresh data
  const data = await loader();
  
  // Cache the result
  cache.set(key, data, ttlMs);
  
  return data;
}
