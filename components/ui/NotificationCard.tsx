// Notification Card Component
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Heart, MessageCircle, UserPlus, Crown, Bell, X } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';
import { useCardAnimation } from '@/hooks/useAnimation';

interface NotificationCardProps {
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    data: any;
    read_at: string | null;
    created_at: string;
  };
  onPress: (notification: any) => void;
  onDismiss: (notificationId: string) => void;
}

export function NotificationCard({ notification, onPress, onDismiss }: NotificationCardProps) {
  const { theme } = useTheme();
  const cardAnimation = useCardAnimation();

  const handlePress = useCallback(() => {
    cardAnimation.press();
    setTimeout(() => cardAnimation.release(), 150);
    onPress(notification);
  }, [notification, onPress, cardAnimation]);

  const handleDismiss = useCallback((e: any) => {
    e.stopPropagation();
    onDismiss(notification.id);
  }, [notification.id, onDismiss]);

  const getNotificationIcon = () => {
    const iconColor = notification.read_at ? theme.text.muted : theme.color.brand[600];
    const iconSize = 24;

    switch (notification.type) {
      case 'reaction':
        return <Heart size={iconSize} color={iconColor} />;
      case 'comment':
        return <MessageCircle size={iconSize} color={iconColor} />;
      case 'follow':
        return <UserPlus size={iconSize} color={iconColor} />;
      case 'achievement':
        return <Crown size={iconSize} color="#FFD700" />;
      default:
        return <Bell size={iconSize} color={iconColor} />;
    }
  };

  const getNotificationColor = () => {
    switch (notification.type) {
      case 'reaction':
        return theme.color.danger[500];
      case 'comment':
        return theme.color.info[500];
      case 'follow':
        return theme.color.success[500];
      case 'achievement':
        return '#FFD700';
      default:
        return theme.color.brand[500];
    }
  };

  const timeSince = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}j`;
  };

  return (
    <Animated.View style={cardAnimation.animatedStyle}>
      <TouchableOpacity
        style={[styles.container, {
          backgroundColor: notification.read_at ? theme.surface.container : theme.color.brand[25],
          borderColor: notification.read_at ? theme.surface.border : theme.color.brand[200],
          borderRadius: theme.radius.lg,
          ...theme.elevation[notification.read_at ? 0 : 1],
        }]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor() + '20' }]}>
            {getNotificationIcon()}
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { 
              color: theme.text.primary,
              fontFamily: theme.typography.fontFamily,
              fontWeight: theme.typography.weights.semibold,
            }]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={[styles.body, { 
              color: theme.text.secondary,
              fontFamily: theme.typography.fontFamily,
            }]} numberOfLines={2}>
              {notification.body}
            </Text>
            <Text style={[styles.timestamp, { 
              color: theme.text.muted,
              fontFamily: theme.typography.fontFamily,
            }]}>
              {timeSince(notification.created_at)}
            </Text>
          </View>

          {notification.data?.avatar_url && (
            <Image 
              source={{ uri: notification.data.avatar_url }}
              style={styles.avatar}
            />
          )}

          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={handleDismiss}
          >
            <X size={16} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        {!notification.read_at && (
          <View style={[styles.unreadIndicator, { backgroundColor: getNotificationColor() }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    borderWidth: 1,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
  },
  dismissButton: {
    padding: 8,
    marginLeft: 4,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});