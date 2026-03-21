import type { KVNamespace } from '@cloudflare/workers-types';

export interface CacheOptions {
  expirationTtl?: number;
  bypassCache?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  hitRate: number;
}

const DEFAULT_TTL = 30;
const STATS_KEY = 'cache_stats';

class CacheManager {
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, invalidations: 0, hitRate: 0 };
  private localCache: Map<string, { value: string; expires: number }> = new Map();
  private readonly LOCAL_CACHE_TTL = 5;

  constructor(private cache: KVNamespace) {}

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  async get<T>(key: string): Promise<T | null> {
    const localEntry = this.localCache.get(key);
    if (localEntry && localEntry.expires > Date.now()) {
      this.stats.hits++;
      this.updateHitRate();
      return JSON.parse(localEntry.value) as T;
    }

    const value = await this.cache.get(key);
    if (value) {
      this.stats.hits++;
      this.updateHitRate();
      this.localCache.set(key, { value, expires: Date.now() + this.LOCAL_CACHE_TTL * 1000 });
      return JSON.parse(value) as T;
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  async set<T>(key: string, value: T, options?: { expirationTtl?: number }): Promise<void> {
    const ttl = options?.expirationTtl ?? DEFAULT_TTL;
    const serialized = JSON.stringify(value);
    this.localCache.set(key, { value: serialized, expires: Date.now() + this.LOCAL_CACHE_TTL * 1000 });
    await this.cache.put(key, serialized, { expirationTtl: ttl });
    this.stats.sets++;
  }

  async delete(key: string): Promise<void> {
    this.localCache.delete(key);
    await this.cache.delete(key);
    this.stats.invalidations++;
  }

  async deletePattern(prefix: string): Promise<void> {
    const keys = await this.cache.list({ prefix });
    for (const key of keys.keys) {
      await this.cache.delete(key.name);
      this.localCache.delete(key.name);
    }
    this.stats.invalidations += keys.keys.length;
  }

  async invalidateAll(): Promise<void> {
    this.localCache.clear();
    const keys = await this.cache.list();
    for (const key of keys.keys) {
      await this.cache.delete(key.name);
    }
    this.stats.invalidations += keys.keys.length;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0, sets: 0, invalidations: 0, hitRate: 0 };
  }
}

export function createCacheManager(cache: KVNamespace): CacheManager {
  return new CacheManager(cache);
}

export type { CacheManager };
