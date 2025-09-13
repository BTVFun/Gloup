// Notifications System Hook
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { realtimeManager } from '@/lib/realtime-manager';
import { AnalyticsManager } from '@/lib/analytics';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read_at).length || 0);

    } catch (error: any) {
      setError(error.message);
      AnalyticsManager.trackError(error, 'useNotifications.loadNotifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));

      AnalyticsManager.trackEvent('notification_read', { notificationId });

    } catch (error: any) {
      AnalyticsManager.trackError(error, 'useNotifications.markAsRead');
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.map(n => ({ 
        ...n, 
        read_at: n.read_at || new Date().toISOString() 
      })));
      setUnreadCount(0);

      AnalyticsManager.trackEvent('notifications_mark_all_read');

    } catch (error: any) {
      AnalyticsManager.trackError(error, 'useNotifications.markAllAsRead');
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.read_at ? Math.max(0, prev - 1) : prev;
      });

    } catch (error: any) {
      AnalyticsManager.trackError(error, 'useNotifications.deleteNotification');
    }
  }, [notifications]);

  // Subscribe to realtime notifications
  useEffect(() => {
    const { data: { user } } = supabase.auth.getUser();
    if (!user) return;

    user.then(({ data: { user } }) => {
      if (!user) return;

      const channelId = realtimeManager.subscribe(`notifications-${user.id}`, {
        table: 'notifications',
        event: 'INSERT',
        filter: `user_id=eq.${user.id}`,
        callback: (payload) => {
          const newNotification = payload.new as Notification;
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          AnalyticsManager.trackEvent('notification_received', {
            type: newNotification.type,
            notificationId: newNotification.id,
          });
        },
      });

      return () => realtimeManager.unsubscribe(channelId);
    });
  }, []);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };
}

// Hook for sending notifications
export function useNotificationSender() {
  const sendNotification = useCallback(async (
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: any
  ) => {
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          user_id: userId,
          type,
          title,
          body,
          data,
        },
      });

      if (error) throw error;

      AnalyticsManager.trackEvent('notification_sent', {
        type,
        targetUserId: userId,
      });

    } catch (error: any) {
      AnalyticsManager.trackError(error, 'useNotificationSender.sendNotification');
      throw error;
    }
  }, []);

  return { sendNotification };
}