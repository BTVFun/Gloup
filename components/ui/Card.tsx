import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming 
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/theme-context';

interface CardProps {
  children: React.ReactNode;
  variant?: 'standard' | 'highlighted' | 'glass' | 'nested';
  elevation?: 0 | 1 | 2 | 3 | 4;
  onPress?: () => void;
  style?: any;
  contentStyle?: any;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

export function Card({ 
  children, 
  variant = 'standard', 
  elevation = 1, 
  onPress, 
  style,
  contentStyle 
}: CardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(theme.elevation[elevation].shadowOpacity);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    
    // Subtle scale and shadow reduction on press
    scale.value = withSpring(0.99, {
      damping: theme.animations.spring.damping,
      stiffness: theme.animations.spring.stiffness,
    });
    shadowOpacity.value = withTiming(theme.elevation[elevation].shadowOpacity * 0.5, {
      duration: theme.animations.timing.fast,
    });
  }, [onPress, scale, shadowOpacity, theme, elevation]);

  const handlePressOut = useCallback(() => {
    if (!onPress) return;
    
    // Return to normal state
    scale.value = withSpring(1, {
      damping: theme.animations.spring.damping,
      stiffness: theme.animations.spring.stiffness,
    });
    shadowOpacity.value = withTiming(theme.elevation[elevation].shadowOpacity, {
      duration: theme.animations.timing.fast,
    });
  }, [onPress, scale, shadowOpacity, theme, elevation]);

  const handleHoverIn = useCallback(() => {
    if (!onPress) return;
    
    // Lift effect on hover (web)
    scale.value = withSpring(1.02, {
      damping: theme.animations.spring.damping,
      stiffness: theme.animations.spring.stiffness,
    });
    shadowOpacity.value = withTiming(theme.elevation[Math.min(elevation + 1, 4)].shadowOpacity, {
      duration: theme.animations.timing.normal,
    });
  }, [onPress, scale, shadowOpacity, theme, elevation]);

  const handleHoverOut = useCallback(() => {
    if (!onPress) return;
    
    // Return to normal state
    scale.value = withSpring(1, {
      damping: theme.animations.spring.damping,
      stiffness: theme.animations.spring.stiffness,
    });
    shadowOpacity.value = withTiming(theme.elevation[elevation].shadowOpacity, {
      duration: theme.animations.timing.normal,
    });
  }, [onPress, scale, shadowOpacity, theme, elevation]);

  // Get card styles based on variant
  const getCardStyles = () => {
    const baseStyle = {
      borderRadius: theme.radius.lg,
      padding: theme.space.lg,
      ...theme.elevation[elevation],
    };

    switch (variant) {
      case 'standard':
        return {
          ...baseStyle,
          backgroundColor: theme.surface.container,
        };
      case 'highlighted':
        return {
          ...baseStyle,
          backgroundColor: theme.surface.container,
          borderWidth: 1,
          borderColor: theme.color.brand[200],
        };
      case 'glass':
        return {
          ...baseStyle,
          backgroundColor: theme.surface.glass,
          borderWidth: 1,
          borderColor: theme.surface.border,
        };
      case 'nested':
        return {
          ...baseStyle,
          backgroundColor: theme.surface.elevated,
          ...theme.elevation[Math.max(elevation - 1, 0)],
        };
      default:
        return baseStyle;
    }
  };

  const cardStyles = getCardStyles();
  const containerStyle = [
    styles.container,
    cardStyles,
    style,
  ];

  const content = (
    <View style={[styles.content, contentStyle]}>
      {children}
    </View>
  );

  // Glass variant uses BlurView
  if (variant === 'glass') {
    const GlassContainer = onPress ? AnimatedTouchableOpacity : AnimatedView;
    
    return (
      <GlassContainer
        style={[animatedStyle, containerStyle, { backgroundColor: 'transparent' }]}
        onPressIn={onPress ? handlePressIn : undefined}
        onPressOut={onPress ? handlePressOut : undefined}
        onPress={onPress}
        // @ts-ignore - Web hover events
        onMouseEnter={onPress ? handleHoverIn : undefined}
        onMouseLeave={onPress ? handleHoverOut : undefined}
        activeOpacity={onPress ? 0.95 : 1}
      >
        <BlurView
          intensity={80}
          tint="light"
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.lg }]}
        />
        {content}
      </GlassContainer>
    );
  }

  // Standard variants
  const Container = onPress ? AnimatedTouchableOpacity : AnimatedView;
  
  return (
    <Container
      style={[animatedStyle, containerStyle]}
      onPressIn={onPress ? handlePressIn : undefined}
      onPressOut={onPress ? handlePressOut : undefined}
      onPress={onPress}
      // @ts-ignore - Web hover events
      onMouseEnter={onPress ? handleHoverIn : undefined}
      onMouseLeave={onPress ? handleHoverOut : undefined}
      activeOpacity={onPress ? 0.95 : 1}
    >
      {content}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});