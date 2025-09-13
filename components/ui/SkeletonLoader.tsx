import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence,
  withTiming,
  interpolate 
} from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 1], [0.3, 0.7]);
    return {
      opacity,
    };
  });

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      false
    );
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.surface.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Post Card Skeleton
export function PostCardSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={[styles.postCard, { backgroundColor: theme.surface.container }]}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.userInfo}>
          <Skeleton width={120} height={16} borderRadius={8} />
          <Skeleton width={80} height={12} borderRadius={6} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={40} height={12} borderRadius={6} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Skeleton width="100%" height={16} borderRadius={8} />
        <Skeleton width="80%" height={16} borderRadius={8} style={{ marginTop: 8 }} />
        <Skeleton width="60%" height={16} borderRadius={8} style={{ marginTop: 8 }} />
      </View>

      {/* Media placeholder */}
      <Skeleton width="100%" height={200} borderRadius={12} style={{ marginTop: 16 }} />

      {/* Actions */}
      <View style={styles.actions}>
        <Skeleton width={60} height={32} borderRadius={16} />
        <Skeleton width={60} height={32} borderRadius={16} />
        <Skeleton width={80} height={12} borderRadius={6} />
      </View>
    </View>
  );
}

// List Item Skeleton
export function ListItemSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={[styles.listItem, { backgroundColor: theme.surface.container }]}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.listItemContent}>
        <Skeleton width="70%" height={16} borderRadius={8} />
        <Skeleton width="50%" height={12} borderRadius={6} style={{ marginTop: 4 }} />
      </View>
      <Skeleton width={20} height={20} borderRadius={10} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  postCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  content: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
});