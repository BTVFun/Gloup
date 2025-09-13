// Notifications Screen
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, CheckCheck, Trash2 } from 'lucide-react-native';
import { NotificationCard } from '@/components/ui/NotificationCard';
import { useNotifications } from '@/hooks/useNotifications';
import { useTabBarScrollContext } from '@/contexts/TabBarScrollContext';
import { useTheme } from '@/lib/theme-context';
import { AnalyticsManager } from '@/lib/analytics';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { onScroll } = useTabBarScrollContext();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotifications();

  useEffect(() => {
    AnalyticsManager.trackScreenView('notifications');
  }, []);

  const handleNotificationPress = (notification: any) => {
    // Mark as read
    if (!notification.read_at) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'reaction':
      case 'comment':
        // Navigate to post
        break;
      case 'follow':
        // Navigate to user profile
        break;
      case 'message':
        // Navigate to chat
        break;
    }
  };

  const renderNotification = ({ item }: { item: any }) => (
    <NotificationCard
      notification={item}
      onPress={handleNotificationPress}
      onDismiss={deleteNotification}
    />
  );

  const renderHeader = () => (
    <View style={styles.headerActions}>
      {unreadCount > 0 && (
        <TouchableOpacity 
          style={[styles.actionButton, { 
            backgroundColor: theme.color.brand[600],
            borderRadius: theme.radius.lg,
          }]}
          onPress={markAllAsRead}
        >
          <CheckCheck size={16} color={theme.text.inverted} />
          <Text style={[styles.actionButtonText, { 
            color: theme.text.inverted,
            fontFamily: theme.typography.fontFamily,
            fontWeight: theme.typography.weights.medium,
          }]}>
            Tout marquer comme lu
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Bell size={48} color={theme.text.muted} />
      <Text style={[styles.emptyTitle, { 
        color: theme.text.secondary,
        fontFamily: theme.typography.fontFamily,
        fontWeight: theme.typography.weights.semibold,
      }]}>
        Aucune notification
      </Text>
      <Text style={[styles.emptyText, { 
        color: theme.text.muted,
        fontFamily: theme.typography.fontFamily,
      }]}>
        Vos notifications apparaîtront ici
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.background }]}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>Restez connecté avec votre communauté</Text>
      </LinearGradient>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        onScroll={onScroll}
        onRefresh={refresh}
        refreshing={loading}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: 20, paddingBottom: 100 }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 12,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  headerActions: {
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 14,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});