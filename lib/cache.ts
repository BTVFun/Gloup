// Intelligent Caching System for Gloup ✨
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  version: string;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig = {
    defaultTTL: 300000, // 5 minutes
    maxSize: 100,
    version: '1.0.0',
  };

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private constructor() {
    this.loadFromStorage();
    this.startCleanupInterval();
  }

  // Get cached data
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (this.isExpired(item)) {
      this.cache.delete(key);
      await this.removeFromStorage(key);
      return null;
    }

    // Check version compatibility
    if (item.version !== this.config.version) {
      this.cache.delete(key);
      await this.removeFromStorage(key);
      return null;
    }

    return item.data;
  }

  // Set cached data
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      version: this.config.version,
    };

    // Enforce cache size limit
    if (this.cache.size >= this.config.maxSize) {
      await this.evictOldest();
    }

    this.cache.set(key, item);
    await this.saveToStorage(key, item);
  }

  // Remove cached data
  async remove(key: string): Promise<void> {
    this.cache.delete(key);
    await this.removeFromStorage(key);
  }

  // Clear all cache
  async clear(): Promise<void> {
    this.cache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Check if item is expired
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  // Evict oldest item
  private async evictOldest(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.remove(oldestKey);
    }
  }

  // Load cache from AsyncStorage
  private async loadFromStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      if (cacheKeys.length === 0) return;

      const items = await AsyncStorage.multiGet(cacheKeys);
      
      for (const [storageKey, value] of items) {
        if (value) {
          try {
            const key = storageKey.replace('cache_', '');
            const item: CacheItem<any> = JSON.parse(value);
            
            // Only load if not expired and version matches
            if (!this.isExpired(item) && item.version === this.config.version) {
              this.cache.set(key, item);
            } else {
              await AsyncStorage.removeItem(storageKey);
            }
          } catch (error) {
            console.error('Error parsing cached item:', error);
            await AsyncStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.error('Error loading cache from storage:', error);
    }
  }

  // Save item to AsyncStorage
  private async saveToStorage<T>(key: string, item: CacheItem<T>): Promise<void> {
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.error('Error saving to cache storage:', error);
    }
  }

  // Remove item from AsyncStorage
  private async removeFromStorage(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error('Error removing from cache storage:', error);
    }
  }

  // Start cleanup interval
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  // Clean up expired items
  private async cleanup(): Promise<void> {
    const expiredKeys: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.remove(key);
    }
  }

  // Get cache statistics
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Could implement hit rate tracking
    };
  }

  // Update configuration
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Cache key generators
export const CacheKeys = {
  feed: (userId?: string, category?: string) => 
    `feed_${userId || 'all'}_${category || 'all'}`,
  
  profile: (userId: string) => `profile_${userId}`,
  
  posts: (userId: string) => `posts_${userId}`,
  
  conversations: (userId: string) => `conversations_${userId}`,
  
  groups: (userId: string) => `groups_${userId}`,
  
  achievements: (userId: string) => `achievements_${userId}`,
  
  notifications: (userId: string) => `notifications_${userId}`,
};