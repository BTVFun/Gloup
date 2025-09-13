// Performance Monitoring System
import { AnalyticsManager } from './analytics';
import { supabaseMetrics } from './supabase-client';
import { realtimeManager } from './realtime-manager';
import { dbOptimizer } from './database-optimizer';

interface PerformanceMetrics {
  timestamp: number;
  memory: {
    used: number;
    total: number;
    limit?: number;
  };
  network: {
    requests: number;
    errors: number;
    avgResponseTime: number;
  };
  realtime: {
    connections: number;
    subscriptions: number;
    reconnects: number;
  };
  database: {
    queries: number;
    slowQueries: number;
    cacheHitRate: number;
  };
  ui: {
    frameRate: number;
    renderTime: number;
    interactions: number;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start performance monitoring
  startMonitoring(intervalMs = 30000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('📊 Performance monitoring started');

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    // Initial collection
    this.collectMetrics();
  }

  // Stop performance monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('📊 Performance monitoring stopped');
  }

  // Collect current performance metrics
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();
      
      // Memory metrics
      const memory = this.getMemoryMetrics();
      
      // Network metrics
      const network = this.getNetworkMetrics();
      
      // Realtime metrics
      const realtime = this.getRealtimeMetrics();
      
      // Database metrics
      const database = this.getDatabaseMetrics();
      
      // UI metrics (mock for now)
      const ui = this.getUIMetrics();

      const metrics: PerformanceMetrics = {
        timestamp,
        memory,
        network,
        realtime,
        database,
        ui,
      };

      this.metrics.push(metrics);

      // Keep only last 100 measurements
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

      // Check for performance issues
      this.checkPerformanceThresholds(metrics);

      // Send to analytics
      AnalyticsManager.trackEvent('performance_metrics', {
        memory_usage: memory.used,
        network_errors: network.errors,
        realtime_connections: realtime.connections,
        slow_queries: database.slowQueries,
      });

    } catch (error) {
      console.error('Error collecting performance metrics:', error);
    }
  }

  // Get memory usage metrics
  private getMemoryMetrics() {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    
    // Fallback for environments without memory API
    return {
      used: 0,
      total: 0,
    };
  }

  // Get network performance metrics
  private getNetworkMetrics() {
    const supabaseStats = supabaseMetrics.getMetrics();
    
    return {
      requests: supabaseStats.requestCount,
      errors: supabaseStats.errorCount,
      avgResponseTime: 0, // Would need to track this separately
    };
  }

  // Get realtime connection metrics
  private getRealtimeMetrics() {
    const realtimeStatus = realtimeManager.getConnectionStatus();
    
    return {
      connections: realtimeStatus.status === 'OPEN' ? 1 : 0,
      subscriptions: realtimeStatus.subscriptionCount,
      reconnects: realtimeStatus.reconnectAttempts,
    };
  }

  // Get database performance metrics
  private getDatabaseMetrics() {
    const dbStats = dbOptimizer.getPerformanceStats();
    const totalQueries = dbStats.reduce((sum, stat) => sum + stat.count, 0);
    const slowQueries = dbStats.filter(stat => stat.avgTime > 200).length;
    
    return {
      queries: totalQueries,
      slowQueries,
      cacheHitRate: 0, // Would need to implement cache hit tracking
    };
  }

  // Get UI performance metrics (mock implementation)
  private getUIMetrics() {
    return {
      frameRate: 60, // Would need actual frame rate monitoring
      renderTime: 16, // Would need actual render time tracking
      interactions: 0, // Would need interaction tracking
    };
  }

  // Check performance thresholds and alert if needed
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const issues: string[] = [];

    // Memory threshold (80% of limit)
    if (metrics.memory.limit && metrics.memory.used > metrics.memory.limit * 0.8) {
      issues.push('High memory usage detected');
    }

    // Network error rate threshold (>5%)
    if (metrics.network.requests > 0) {
      const errorRate = (metrics.network.errors / metrics.network.requests) * 100;
      if (errorRate > 5) {
        issues.push(`High network error rate: ${errorRate.toFixed(1)}%`);
      }
    }

    // Realtime connection issues
    if (metrics.realtime.reconnects > 3) {
      issues.push('Frequent realtime reconnections detected');
    }

    // Database performance issues
    if (metrics.database.slowQueries > 5) {
      issues.push(`${metrics.database.slowQueries} slow database queries detected`);
    }

    // Log performance issues
    if (issues.length > 0) {
      console.warn('⚠️ Performance issues detected:', issues);
      AnalyticsManager.trackEvent('performance_warning', {
        issues,
        timestamp: metrics.timestamp,
      });
    }
  }

  // Get current performance summary
  getPerformanceSummary() {
    if (this.metrics.length === 0) {
      return null;
    }

    const latest = this.metrics[this.metrics.length - 1];
    const previous = this.metrics.length > 1 ? this.metrics[this.metrics.length - 2] : null;

    return {
      current: latest,
      trend: previous ? {
        memory: latest.memory.used - previous.memory.used,
        networkErrors: latest.network.errors - previous.network.errors,
        slowQueries: latest.database.slowQueries - previous.database.slowQueries,
      } : null,
      isHealthy: this.isSystemHealthy(latest),
    };
  }

  // Check if system is performing well
  private isSystemHealthy(metrics: PerformanceMetrics): boolean {
    // Memory check
    if (metrics.memory.limit && metrics.memory.used > metrics.memory.limit * 0.9) {
      return false;
    }

    // Network error rate check
    if (metrics.network.requests > 0) {
      const errorRate = (metrics.network.errors / metrics.network.requests) * 100;
      if (errorRate > 10) {
        return false;
      }
    }

    // Realtime connection check
    if (metrics.realtime.reconnects > 5) {
      return false;
    }

    // Database performance check
    if (metrics.database.slowQueries > 10) {
      return false;
    }

    return true;
  }

  // Get historical metrics
  getHistoricalMetrics(minutes = 30): PerformanceMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Export metrics for analysis
  exportMetrics(): string {
    return JSON.stringify({
      exported_at: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
    }, null, 2);
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-start monitoring in development
if (__DEV__) {
  performanceMonitor.startMonitoring(60000); // Every minute in dev
}