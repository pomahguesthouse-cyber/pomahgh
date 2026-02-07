// Redis client wrapper for real-time pricing cache
// High-performance caching with automatic failover

import Redis from 'https://deno.land/x/redis@v0.31.0/mod.ts';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix: string;
  ttl: {
    price: number; // 15 minutes
    occupancy: number; // 5 minutes
    competitor: number; // 1 hour
    metrics: number; // 24 hours
  };
}

interface PriceCacheData {
  room_id: string;
  date: string;
  price_per_night: number;
  base_price: number;
  occupancy_rate: number;
  demand_multiplier: number;
  time_multiplier: number;
  competitor_multiplier: number;
  final_multiplier: number;
  pricing_factors: any;
  calculated_at: string;
  expires_at: string;
}

interface OccupancyCacheData {
  room_id: string;
  date: string;
  total_allotment: number;
  booked_units: number;
  available_units: number;
  occupancy_rate: number;
  demand_score: number;
  calculated_at: string;
}

interface CompetitorCacheData {
  room_id: string;
  date: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  sample_count: number;
  last_updated: string;
}

export class RealTimePricingCache {
  private redis: Redis;
  private config: CacheConfig;
  private fallbackCache: Map<string, any> = new Map();

  constructor(config: CacheConfig) {
    this.config = config;
    this.redis = new Redis({
      hostname: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0
    });
  }

  // Price cache operations
  async getPrice(roomId: string, date: string): Promise<PriceCacheData | null> {
    const key = this.buildKey('price', roomId, date);
    
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Redis getPrice error:', error);
      return this.getFallback(key);
    }
  }

  async setPrice(roomId: string, date: string, data: PriceCacheData): Promise<void> {
    const key = this.buildKey('price', roomId, date);
    
    try {
      await this.redis.setex(
        key, 
        this.config.ttl.price, 
        JSON.stringify(data)
      );
      this.setFallback(key, data);
    } catch (error) {
      console.error('Redis setPrice error:', error);
      this.setFallback(key, data);
    }
  }

  async invalidatePrice(roomId: string, date: string): Promise<void> {
    const key = this.buildKey('price', roomId, date);
    
    try {
      await this.redis.del(key);
      this.fallbackCache.delete(key);
    } catch (error) {
      console.error('Redis invalidatePrice error:', error);
      this.fallbackCache.delete(key);
    }
  }

  // Occupancy cache operations
  async getOccupancy(roomId: string, date: string): Promise<OccupancyCacheData | null> {
    const key = this.buildKey('occupancy', roomId, date);
    
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Redis getOccupancy error:', error);
      return this.getFallback(key);
    }
  }

  async setOccupancy(roomId: string, date: string, data: OccupancyCacheData): Promise<void> {
    const key = this.buildKey('occupancy', roomId, date);
    
    try {
      await this.redis.setex(
        key, 
        this.config.ttl.occupancy, 
        JSON.stringify(data)
      );
      this.setFallback(key, data);
    } catch (error) {
      console.error('Redis setOccupancy error:', error);
      this.setFallback(key, data);
    }
  }

  // Competitor cache operations
  async getCompetitor(roomId: string, date: string): Promise<CompetitorCacheData | null> {
    const key = this.buildKey('competitor', roomId, date);
    
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Redis getCompetitor error:', error);
      return this.getFallback(key);
    }
  }

  async setCompetitor(roomId: string, date: string, data: CompetitorCacheData): Promise<void> {
    const key = this.buildKey('competitor', roomId, date);
    
    try {
      await this.redis.setex(
        key, 
        this.config.tilt.competitor, 
        JSON.stringify(data)
      );
      this.setFallback(key, data);
    } catch (error) {
      console.error('Redis setCompetitor error:', error);
      this.setFallback(key, data);
    }
  }

  // Batch operations for performance
  async getMultiplePrices(roomIds: string[], date: string): Promise<Map<string, PriceCacheData | null>> {
    const keys = roomIds.map(id => this.buildKey('price', id, date));
    const results = new Map<string, PriceCacheData | null>();

    try {
      const cachedValues = await this.redis.mget(...keys);
      
      roomIds.forEach((roomId, index) => {
        const cached = cachedValues[index];
        if (cached) {
          results.set(roomId, JSON.parse(cached));
        } else {
          results.set(roomId, null);
        }
      });
    } catch (error) {
      console.error('Redis getMultiplePrices error:', error);
      // Fallback to individual gets
      for (const roomId of roomIds) {
        results.set(roomId, await this.getPrice(roomId, date));
      }
    }

    return results;
  }

  async setMultiplePrices(prices: Array<{ roomId: string; date: string; data: PriceCacheData }>): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    try {
      for (const { roomId, date, data } of prices) {
        const key = this.buildKey('price', roomId, date);
        pipeline.setex(key, this.config.tilt.price, JSON.stringify(data));
      }
      
      await pipeline.flush();
    } catch (error) {
      console.error('Redis setMultiplePrices error:', error);
      // Fallback to individual sets
      for (const { roomId, date, data } of prices) {
        await this.setPrice(roomId, date, data);
      }
    }
  }

  // Cache warming strategies
  async warmPriceCache(roomIds: string[], dates: string[]): Promise<void> {
    console.log(`Warming price cache for ${roomIds.length} rooms and ${dates.length} dates`);
    
    // This would typically call your pricing calculation engine
    // For now, we'll just log the operation
    const totalOperations = roomIds.length * dates.length;
    console.log(`Cache warming will perform ${totalOperations} calculations`);
  }

  // Cache statistics and monitoring
  async getCacheStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory_info: info,
        keyspace_info: keyspace,
        fallback_cache_size: this.fallbackCache.size,
        config: this.config
      };
    } catch (error) {
      console.error('Redis getCacheStats error:', error);
      return {
        error: error.message,
        fallback_cache_size: this.fallbackCache.size
      };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = 'health_check_test';
      await this.redis.set(testKey, 'test');
      const result = await this.redis.get(testKey);
      await this.redis.del(testKey);
      return result === 'test';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Utility methods
  private buildKey(type: string, roomId: string, date: string): string {
    return `${this.config.keyPrefix}:${type}:${roomId}:${date}`;
  }

  private setFallback(key: string, data: any): void {
    // Limit fallback cache size
    if (this.fallbackCache.size > 1000) {
      const firstKey = this.fallbackCache.keys().next().value;
      this.fallbackCache.delete(firstKey);
    }
    this.fallbackCache.set(key, data);
  }

  private getFallback(key: string): any {
    return this.fallbackCache.get(key) || null;
  }

  // Cleanup expired entries
  async cleanupExpired(): Promise<void> {
    try {
      // Redis handles TTL automatically, but we can clean up fallback cache
      const now = Date.now();
      for (const [key, data] of this.fallbackCache.entries()) {
        if (data.expires_at && new Date(data.expires_at).getTime() < now) {
          this.fallbackCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  // Close connection
  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Redis close error:', error);
    }
  }
}

// Cache configuration
export const cacheConfig: CacheConfig = {
  host: Deno.env.get('REDIS_HOST') || 'localhost',
  port: parseInt(Deno.env.get('REDIS_PORT') || '6379'),
  password: Deno.env.get('REDIS_PASSWORD'),
  db: parseInt(Deno.env.get('REDIS_DB') || '0'),
  keyPrefix: 'pricing',
  ttl: {
    price: 900, // 15 minutes
    occupancy: 300, // 5 minutes
    competitor: 3600, // 1 hour
    metrics: 86400 // 24 hours
  }
};

// Export singleton instance
export let pricingCache: RealTimePricingCache;

export function initializeCache(): RealTimePricingCache {
  pricingCache = new RealTimePricingCache(cacheConfig);
  return pricingCache;
}