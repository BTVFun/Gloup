// Enhanced Supabase Client with Performance Monitoring and Error Handling
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AnalyticsManager } from './analytics';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = (Constants.expoConfig?.extra ?? {}) as {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase config manquante: définissez SUPABASE_URL et SUPABASE_ANON_KEY');
}

// Enhanced client with monitoring
class EnhancedSupabaseClient {
  private client: SupabaseClient;
  private requestCount = 0;
  private errorCount = 0;

  constructor() {
    this.client = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'x-client-info': 'gloup-mobile@1.0.0',
        },
      },
    });

    this.setupPerformanceMonitoring();
  }

  private setupPerformanceMonitoring() {
    // Monitor API calls
    const originalFrom = this.client.from.bind(this.client);
    this.client.from = (table: string) => {
      const startTime = Date.now();
      this.requestCount++;
      
      const query = originalFrom(table);
      const originalSelect = query.select.bind(query);
      
      query.select = (...args: any[]) => {
        const result = originalSelect(...args);
        
        // Monitor the promise
        if (result.then) {
          result.then(
            (data: any) => {
              const duration = Date.now() - startTime;
              AnalyticsManager.trackAPICall(`/${table}`, 'SELECT', duration, 200);
              
              if (duration > 200) {
                console.warn(`Slow query detected: ${table} took ${duration}ms`);
              }
              return data;
            },
            (error: any) => {
              this.errorCount++;
              const duration = Date.now() - startTime;
              AnalyticsManager.trackAPICall(`/${table}`, 'SELECT', duration, 500);
              AnalyticsManager.trackError(error, `Supabase query failed: ${table}`);
              throw error;
            }
          );
        }
        
        return result;
      };
      
      return query;
    };
  }

  // Expose the client
  get supabase() {
    return this.client;
  }

  // Performance metrics
  getMetrics() {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from('profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

const enhancedClient = new EnhancedSupabaseClient();
export const supabase = enhancedClient.supabase;
export const supabaseMetrics = enhancedClient;