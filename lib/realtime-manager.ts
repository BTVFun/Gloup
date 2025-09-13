// Realtime Manager for Optimized Subscriptions
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase-client';
import { AnalyticsManager } from './analytics';

interface SubscriptionConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: RealtimePostgresChangesPayload<any>) => void;
  onError?: (error: any) => void;
}

export class RealtimeManager {
  private static instance: RealtimeManager;
  private channels = new Map<string, RealtimeChannel>();
  private subscriptions = new Map<string, SubscriptionConfig>();
  private connectionStatus: 'CONNECTING' | 'OPEN' | 'CLOSED' = 'CLOSED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  private constructor() {
    this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring() {
    // Monitor connection status
    supabase.realtime.onOpen(() => {
      this.connectionStatus = 'OPEN';
      this.reconnectAttempts = 0;
      AnalyticsManager.trackEvent('realtime_connected');
      console.log('✅ Realtime connected');
    });

    supabase.realtime.onClose(() => {
      this.connectionStatus = 'CLOSED';
      AnalyticsManager.trackEvent('realtime_disconnected');
      console.log('❌ Realtime disconnected');
      this.handleReconnection();
    });

    supabase.realtime.onError((error) => {
      AnalyticsManager.trackError(error, 'Realtime connection error');
      console.error('🔥 Realtime error:', error);
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.reconnectAllChannels();
      }, delay);
    }
  }

  private reconnectAllChannels() {
    for (const [channelId, config] of this.subscriptions.entries()) {
      this.unsubscribe(channelId);
      this.subscribe(channelId, config);
    }
  }

  // Subscribe to realtime changes
  subscribe(channelId: string, config: SubscriptionConfig): string {
    try {
      // Remove existing subscription
      this.unsubscribe(channelId);

      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: config.event || '*',
            schema: 'public',
            table: config.table,
            filter: config.filter,
          },
          (payload) => {
            try {
              AnalyticsManager.trackEvent('realtime_message_received', {
                table: config.table,
                event: payload.eventType,
                channelId,
              });
              config.callback(payload);
            } catch (error) {
              AnalyticsManager.trackError(error as Error, `Realtime callback error: ${channelId}`);
              config.onError?.(error);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to ${channelId}`);
            AnalyticsManager.trackEvent('realtime_subscribed', { channelId });
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Subscription error for ${channelId}`);
            AnalyticsManager.trackEvent('realtime_subscription_error', { channelId });
            config.onError?.(new Error(`Subscription failed for ${channelId}`));
          }
        });

      this.channels.set(channelId, channel);
      this.subscriptions.set(channelId, config);

      return channelId;
    } catch (error) {
      AnalyticsManager.trackError(error as Error, `Failed to subscribe to ${channelId}`);
      throw error;
    }
  }

  // Unsubscribe from channel
  unsubscribe(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelId);
      this.subscriptions.delete(channelId);
      console.log(`🔌 Unsubscribed from ${channelId}`);
    }
  }

  // Subscribe to post reactions
  subscribeToPostReactions(postIds: string[], callback: (payload: any) => void): string {
    const channelId = `post-reactions-${postIds.join('-')}`;
    return this.subscribe(channelId, {
      table: 'reactions',
      event: '*',
      filter: `post_id=in.(${postIds.join(',')})`,
      callback,
      onError: (error) => console.error('Post reactions subscription error:', error),
    });
  }

  // Subscribe to group messages
  subscribeToGroupMessages(groupId: string, callback: (payload: any) => void): string {
    const channelId = `group-messages-${groupId}`;
    return this.subscribe(channelId, {
      table: 'group_messages',
      event: 'INSERT',
      filter: `group_id=eq.${groupId}`,
      callback,
      onError: (error) => console.error('Group messages subscription error:', error),
    });
  }

  // Subscribe to direct messages
  subscribeToDirectMessages(userId: string, callback: (payload: any) => void): string {
    const channelId = `direct-messages-${userId}`;
    return this.subscribe(channelId, {
      table: 'direct_messages',
      event: 'INSERT',
      filter: `receiver_id=eq.${userId}`,
      callback,
      onError: (error) => console.error('Direct messages subscription error:', error),
    });
  }

  // Subscribe to user presence
  subscribeToPresence(channelId: string, userId: string, userInfo: any): string {
    const channel = supabase.channel(channelId, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        AnalyticsManager.trackEvent('presence_sync', {
          channelId,
          userCount: Object.keys(newState).length,
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        AnalyticsManager.trackEvent('user_joined', { channelId, userId: key });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        AnalyticsManager.trackEvent('user_left', { channelId, userId: key });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userInfo);
        }
      });

    this.channels.set(channelId, channel);
    return channelId;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      channelCount: this.channels.size,
      subscriptionCount: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Cleanup all subscriptions
  cleanup(): void {
    for (const channelId of this.channels.keys()) {
      this.unsubscribe(channelId);
    }
    console.log('🧹 Realtime manager cleaned up');
  }
}

// Export singleton instance
export const realtimeManager = RealtimeManager.getInstance();