import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: any;
}

export function LoadingSpinner({ size = 'medium', color, style }: LoadingSpinnerProps) {
  const { theme } = useTheme();
  const rotation = useSharedValue(0);

  const getSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 32;
      default:
        return 24;
    }
  };

  const spinnerColor = color || theme.color.brand[600];
  const spinnerSize = getSize();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [rotation]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            borderColor: `${spinnerColor}20`,
            borderTopColor: spinnerColor,
            borderWidth: spinnerSize / 8,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

// Dots loading animation
export function LoadingDots({ size = 'medium', color, style }: LoadingSpinnerProps) {
  const { theme } = useTheme();
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  const getDotSize = () => {
    switch (size) {
      case 'small':
        return 4;
      case 'large':
        return 8;
      default:
        return 6;
    }
  };

  const dotColor = color || theme.color.brand[600];
  const dotSize = getDotSize();

  const createDotAnimation = (dot: Animated.SharedValue<number>, delay: number) => {
    return useAnimatedStyle(() => ({
      transform: [{ translateY: dot.value }],
      opacity: 0.4 + (Math.abs(dot.value) / 8) * 0.6,
    }));
  };

  const dot1Style = createDotAnimation(dot1, 0);
  const dot2Style = createDotAnimation(dot2, 100);
  const dot3Style = createDotAnimation(dot3, 200);

  useEffect(() => {
    const animateDot = (dot: Animated.SharedValue<number>, delay: number) => {
      dot.value = withRepeat(
        withSequence(
          withTiming(0, { duration: delay }),
          withTiming(-8, { duration: 400, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      );
    };

    animateDot(dot1, 0);
    animateDot(dot2, 100);
    animateDot(dot3, 200);
  }, [dot1, dot2, dot3]);

  return (
    <View style={[styles.dotsContainer, style]}>
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: dotColor,
          },
          dot1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: dotColor,
          },
          dot2Style,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: dotColor,
          },
          dot3Style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    borderRadius: 999,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    borderRadius: 999,
  },
});