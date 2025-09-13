import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withSequence,
  withTiming 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/theme-context';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: any;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false,
  icon,
  style 
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Press animation
    scale.value = withSpring(0.98, {
      damping: theme.animations.spring.damping,
      stiffness: theme.animations.spring.stiffness,
    });
  }, [disabled, loading, scale, theme]);

  const handlePressOut = useCallback(() => {
    if (disabled || loading) return;
    
    // Release animation with gentle bounce
    scale.value = withSpring(1, {
      damping: 10,
      stiffness: 300,
    });
  }, [disabled, loading, scale]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    
    // Success animation
    scale.value = withSequence(
      withSpring(1.02, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    
    onPress();
  }, [disabled, loading, onPress, scale]);

  // Get button styles based on variant
  const getButtonStyles = () => {
    const baseStyle = {
      borderRadius: theme.radius.md,
      ...theme.elevation[variant === 'primary' ? 2 : 1],
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: theme.color.brand[600],
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.surface.container,
          borderWidth: 1,
          borderColor: theme.color.brand[600],
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          ...theme.elevation[0],
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: theme.color.danger[500],
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: theme.color.success[500],
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyles = () => {
    const baseTextStyle = {
      fontFamily: theme.typography.fontFamily,
      fontWeight: theme.typography.weights.semibold,
    };

    switch (size) {
      case 'small':
        return { ...baseTextStyle, fontSize: theme.typography.body.sm };
      case 'large':
        return { ...baseTextStyle, fontSize: theme.typography.body.lg };
      default:
        return { ...baseTextStyle, fontSize: theme.typography.body.md };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'success':
        return theme.text.inverted;
      case 'secondary':
        return theme.color.brand[600];
      case 'ghost':
        return theme.color.brand[600];
      default:
        return theme.text.primary;
    }
  };

  const getContainerHeight = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 48;
      default:
        return 40;
    }
  };

  const buttonStyles = getButtonStyles();
  const textStyles = getTextStyles();
  const textColor = getTextColor();
  const containerHeight = getContainerHeight();

  // Disabled styles
  if (disabled) {
    opacity.value = 0.5;
  } else if (opacity.value !== 1) {
    opacity.value = withTiming(1, { duration: theme.animations.timing.fast });
  }

  const containerStyle = [
    styles.container,
    buttonStyles,
    { height: containerHeight },
    disabled && styles.disabled,
    style,
  ];

  const contentStyle = [
    styles.content,
    icon && styles.contentWithIcon,
  ];

  const textStyle = [
    textStyles,
    { color: textColor },
    disabled && styles.disabledText,
  ];

  // Use gradient for primary variant
  if (variant === 'primary' && !disabled) {
    return (
      <AnimatedTouchableOpacity
        style={[animatedStyle, containerStyle, { backgroundColor: 'transparent' }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <LinearGradient
          colors={[theme.color.brand[600], theme.color.brand[700]]}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.md }]}
        />
        <Animated.View style={contentStyle}>
          {icon && <Animated.View style={styles.icon}>{icon}</Animated.View>}
          <Text style={textStyle}>
            {loading ? 'Chargement...' : title}
          </Text>
        </Animated.View>
      </AnimatedTouchableOpacity>
    );
  }

  return (
    <AnimatedTouchableOpacity
      style={[animatedStyle, containerStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Animated.View style={contentStyle}>
        {icon && <Animated.View style={styles.icon}>{icon}</Animated.View>}
        <Text style={textStyle}>
          {loading ? 'Chargement...' : title}
        </Text>
      </Animated.View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    minWidth: 44, // Accessibility minimum
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWithIcon: {
    paddingHorizontal: 4,
  },
  icon: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});