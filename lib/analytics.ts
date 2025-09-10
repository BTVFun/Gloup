// Performance Monitoring and Analytics for Gloup ✨
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ErrorReport {
  error: Error;
  context?: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  stackTrace?: string;
}

export class AnalyticsManager {
  private static sessionId = Date.now().toString();
  private static events: AnalyticsEvent[] = [];
  private static metrics: PerformanceMetric[] = [];
  private static errors: ErrorReport[] = [];
  private static userId?: string;

  // Initialize analytics
  static async initialize(userId?: string): Promise<void> {
    this.userId = userId;
    this.sessionId = Date.now().toString();
    
    // Load queued events from storage
    await this.loadQueuedData();
    
    // Start periodic flush
    this.startPeriodicFlush();
    
    // Track app start
    this.trackEvent('app_started', {
      platform: Platform.OS,
      version: Platform.Version,
    });
  }

  // Track user event
  static trackEvent(name: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.events.push(event);
    this.queueForStorage('events', event);

    // Console log in development
    if (__DEV__) {
      console.log('📊 Analytics Event:', name, properties);
    }
  }

  // Track performance metric
  static trackPerformance(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    this.queueForStorage('metrics', metric);

    // Console log in development
    if (__DEV__) {
      console.log('⚡ Performance Metric:', name, `${value}ms`, metadata);
    }
  }

  // Track error
  static trackError(error: Error, context?: string): void {
    const errorReport: ErrorReport = {
      error,
      context,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      stackTrace: error.stack,
    };

    this.errors.push(errorReport);
    this.queueForStorage('errors', errorReport);

    // Console error in development
    if (__DEV__) {
      console.error('🚨 Error Tracked:', error.message, context);
    }
  }

  // Track screen view
  static trackScreenView(screenName: string, properties?: Record<string, any>): void {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  // Track user action
  static trackUserAction(action: string, target: string, properties?: Record<string, any>): void {
    this.trackEvent('user_action', {
      action,
      target,
      ...properties,
    });
  }

  // Track API call performance
  static trackAPICall(endpoint: string, method: string, duration: number, status: number): void {
    this.trackPerformance('api_call', duration, {
      endpoint,
      method,
      status,
    });
  }

  // Track component render time
  static trackComponentRender(componentName: string, renderTime: number): void {
    this.trackPerformance('component_render', renderTime, {
      component: componentName,
    });
  }

  // Track memory usage
  static trackMemoryUsage(): void {
    if (Platform.OS === 'web' && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.trackPerformance('memory_usage', memory.usedJSHeapSize, {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      });
    }
  }

  // Flush data to server (mock implementation)
  static async flush(): Promise<void> {
    try {
      // In a real implementation, you would send data to your analytics service
      const payload = {
        events: this.events,
        metrics: this.metrics,
        errors: this.errors,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: Date.now(),
      };

      // Mock API call
      if (__DEV__) {
        console.log('📤 Analytics Flush:', payload);
      }

      // Clear sent data
      this.events = [];
      this.metrics = [];
      this.errors = [];

      // Clear storage
      await AsyncStorage.multiRemove([
        'analytics_events',
        'analytics_metrics',
        'analytics_errors',
      ]);

    } catch (error) {
      console.error('Error flushing analytics:', error);
    }
  }

  // Queue data for storage
  private static async queueForStorage(type: string, data: any): Promise<void> {
    try {
      const key = `analytics_${type}`;
      const existing = await AsyncStorage.getItem(key);
      const queue = existing ? JSON.parse(existing) : [];
      
      queue.push(data);
      
      // Limit queue size
      if (queue.length > 100) {
        queue.splice(0, queue.length - 100);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(queue));
    } catch (error) {
      console.error('Error queuing analytics data:', error);
    }
  }

  // Load queued data from storage
  private static async loadQueuedData(): Promise<void> {
    try {
      const [events, metrics, errors] = await AsyncStorage.multiGet([
        'analytics_events',
        'analytics_metrics',
        'analytics_errors',
      ]);

      if (events[1]) {
        this.events = JSON.parse(events[1]);
      }
      if (metrics[1]) {
        this.metrics = JSON.parse(metrics[1]);
      }
      if (errors[1]) {
        this.errors = JSON.parse(errors[1]);
      }
    } catch (error) {
      console.error('Error loading queued analytics data:', error);
    }
  }

  // Start periodic flush
  private static startPeriodicFlush(): void {
    setInterval(() => {
      if (this.events.length > 0 || this.metrics.length > 0 || this.errors.length > 0) {
        this.flush();
      }
    }, 30000); // Flush every 30 seconds
  }

  // Get analytics summary
  static getSummary(): {
    events: number;
    metrics: number;
    errors: number;
    sessionId: string;
  } {
    return {
      events: this.events.length,
      metrics: this.metrics.length,
      errors: this.errors.length,
      sessionId: this.sessionId,
    };
  }
}

// Performance measurement utilities
export class PerformanceTracker {
  private static measurements = new Map<string, number>();

  // Start measuring
  static start(name: string): void {
    this.measurements.set(name, Date.now());
  }

  // End measuring and track
  static end(name: string, metadata?: Record<string, any>): number {
    const startTime = this.measurements.get(name);
    if (!startTime) {
      console.warn(`Performance measurement '${name}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.measurements.delete(name);
    
    AnalyticsManager.trackPerformance(name, duration, metadata);
    return duration;
  }

  // Measure async function
  static async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, { ...metadata, error: true });
      throw error;
    }
  }

  // Measure sync function
  static measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    this.start(name);
    try {
      const result = fn();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, { ...metadata, error: true });
      throw error;
    }
  }
}

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const startTime = Date.now();

  React.useEffect(() => {
    const renderTime = Date.now() - startTime;
    AnalyticsManager.trackComponentRender(componentName, renderTime);
  }, [componentName, startTime]);
}