// src/modules/analytics/services/cache.service.ts

import { createContextLogger } from "../../../config/logger";

const cacheLogger = createContextLogger("AnalyticsCache");

/**
 * Generic caching service for analytics data
 */
export class AnalyticsCacheService {
  private static cache: Map<string, { data: any; expiry: number }> = new Map();
  
  /**
   * Get a value from cache
   */
  static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    // Return null if not found or expired
    if (!item || item.expiry < Date.now()) {
      if (item) {
        // Clean up expired items
        this.cache.delete(key);
        cacheLogger.debug(`Cache miss (expired): ${key}`);
      } else {
        cacheLogger.debug(`Cache miss (not found): ${key}`);
      }
      return null;
    }
    
    cacheLogger.debug(`Cache hit: ${key}`);
    return item.data as T;
  }
  
  /**
   * Set a value in cache
   */
  static set<T>(key: string, data: T, ttlSeconds = 300): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
    cacheLogger.debug(`Cached: ${key} (TTL: ${ttlSeconds}s)`);
    
    // Auto-clean if cache is getting too large
    if (this.cache.size > 1000) {
      this.cleanExpired();
    }
  }
  
  /**
   * Delete a value from cache
   */
  static delete(key: string): void {
    const existed = this.cache.delete(key);
    if (existed) {
      cacheLogger.debug(`Deleted from cache: ${key}`);
    }
  }
  
  /**
   * Clear all cached values
   */
  static clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    cacheLogger.info(`Analytics cache cleared (${count} items)`);
  }
  
  /**
   * Get cache stats
   */
  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
  
  /**
   * Clean expired entries
   */
  static cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      cacheLogger.info(`Cleaned ${cleaned} expired cache entries`);
    }
    
    return cleaned;
  }
}

export default AnalyticsCacheService;