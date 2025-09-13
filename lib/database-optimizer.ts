// Database Query Optimizer and Cache Manager
import { supabase } from './supabase-client';
import { CacheManager, CacheKeys } from './cache';
import { AnalyticsManager, PerformanceTracker } from './analytics';

interface QueryConfig {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  cacheKey?: string;
  cacheTTL?: number;
  useCache?: boolean;
}

export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private cache = CacheManager.getInstance();
  private queryStats = new Map<string, { count: number; totalTime: number; errors: number }>();

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  // Optimized query with caching and performance monitoring
  async query<T>(config: QueryConfig): Promise<{ data: T[] | null; error: any; fromCache: boolean }> {
    const startTime = Date.now();
    const queryKey = this.generateQueryKey(config);
    
    try {
      // Try cache first
      if (config.useCache !== false && config.cacheKey) {
        const cachedData = await this.cache.get<T[]>(config.cacheKey);
        if (cachedData) {
          this.trackQueryPerformance(queryKey, Date.now() - startTime, false);
          return { data: cachedData, error: null, fromCache: true };
        }
      }

      // Build query
      let query = supabase.from(config.table);
      
      if (config.select) {
        query = query.select(config.select);
      }

      // Apply filters
      if (config.filters) {
        for (const [key, value] of Object.entries(config.filters)) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'object' && value.operator) {
            switch (value.operator) {
              case 'gte':
                query = query.gte(key, value.value);
                break;
              case 'lte':
                query = query.lte(key, value.value);
                break;
              case 'like':
                query = query.like(key, value.value);
                break;
              case 'ilike':
                query = query.ilike(key, value.value);
                break;
              default:
                query = query.eq(key, value.value);
            }
          } else {
            query = query.eq(key, value);
          }
        }
      }

      // Apply ordering
      if (config.orderBy) {
        query = query.order(config.orderBy.column, { ascending: config.orderBy.ascending ?? false });
      }

      // Apply pagination
      if (config.limit) {
        query = query.limit(config.limit);
      }
      if (config.offset) {
        query = query.range(config.offset, config.offset + (config.limit || 20) - 1);
      }

      const { data, error } = await query;
      const duration = Date.now() - startTime;

      if (error) {
        this.trackQueryPerformance(queryKey, duration, true);
        AnalyticsManager.trackError(error, `Database query failed: ${config.table}`);
        return { data: null, error, fromCache: false };
      }

      // Cache successful results
      if (config.useCache !== false && config.cacheKey && data) {
        await this.cache.set(config.cacheKey, data, config.cacheTTL);
      }

      this.trackQueryPerformance(queryKey, duration, false);
      return { data, error: null, fromCache: false };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(queryKey, duration, true);
      AnalyticsManager.trackError(error as Error, `Database query exception: ${config.table}`);
      return { data: null, error, fromCache: false };
    }
  }

  // Optimized feed query
  async getFeed(userId?: string, category?: string, offset = 0, limit = 20) {
    return this.query({
      table: 'posts',
      select: `
        id, content, media_url, media_urls, glow_points, category, created_at,
        profiles:author_id (
          id, username, full_name, avatar_url, glow_points, is_verified
        )
      `,
      filters: {
        privacy: 'public',
        ...(category && { category }),
      },
      orderBy: { column: 'created_at', ascending: false },
      limit,
      offset,
      cacheKey: CacheKeys.feed(userId, category),
      cacheTTL: 300000, // 5 minutes
      useCache: offset === 0, // Only cache first page
    });
  }

  // Optimized user posts query
  async getUserPosts(userId: string, offset = 0, limit = 20) {
    return this.query({
      table: 'posts',
      select: `
        id, content, media_url, media_urls, glow_points, created_at,
        profiles:author_id (
          id, username, full_name, avatar_url, is_verified
        )
      `,
      filters: { author_id: userId },
      orderBy: { column: 'created_at', ascending: false },
      limit,
      offset,
      cacheKey: CacheKeys.posts(userId),
      cacheTTL: 600000, // 10 minutes
    });
  }

  // Optimized reactions query
  async getPostReactions(postIds: string[]) {
    if (postIds.length === 0) return { data: [], error: null, fromCache: false };

    return this.query({
      table: 'reactions',
      select: 'post_id, kind, points, user_id',
      filters: { post_id: postIds },
      cacheKey: `reactions-${postIds.join('-')}`,
      cacheTTL: 60000, // 1 minute
    });
  }

  // Batch insert with error handling
  async batchInsert(table: string, records: any[]): Promise<{ success: boolean; errors: any[] }> {
    const batchSize = 100;
    const errors: any[] = [];
    let successCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase.from(table).insert(batch);
        if (error) {
          errors.push({ batch: i / batchSize, error });
        } else {
          successCount += batch.length;
        }
      } catch (error) {
        errors.push({ batch: i / batchSize, error });
      }
    }

    AnalyticsManager.trackEvent('batch_insert', {
      table,
      totalRecords: records.length,
      successCount,
      errorCount: errors.length,
    });

    return {
      success: errors.length === 0,
      errors,
    };
  }

  // Generate cache-friendly query key
  private generateQueryKey(config: QueryConfig): string {
    return `${config.table}-${JSON.stringify(config.filters)}-${config.orderBy?.column}-${config.limit}`;
  }

  // Track query performance
  private trackQueryPerformance(queryKey: string, duration: number, hasError: boolean): void {
    const stats = this.queryStats.get(queryKey) || { count: 0, totalTime: 0, errors: 0 };
    stats.count++;
    stats.totalTime += duration;
    if (hasError) stats.errors++;
    
    this.queryStats.set(queryKey, stats);

    // Log slow queries
    if (duration > 200) {
      console.warn(`🐌 Slow query detected: ${queryKey} took ${duration}ms`);
      AnalyticsManager.trackEvent('slow_query', { queryKey, duration });
    }
  }

  // Get performance statistics
  getPerformanceStats() {
    const stats = Array.from(this.queryStats.entries()).map(([key, stat]) => ({
      query: key,
      count: stat.count,
      avgTime: Math.round(stat.totalTime / stat.count),
      errorRate: (stat.errors / stat.count) * 100,
    }));

    return stats.sort((a, b) => b.avgTime - a.avgTime);
  }

  // Clear cache for specific patterns
  async invalidateCache(pattern: string): Promise<void> {
    // This would need to be implemented based on your cache implementation
    console.log(`🗑️ Invalidating cache for pattern: ${pattern}`);
  }
}

// Export singleton
export const dbOptimizer = DatabaseOptimizer.getInstance();