// Follow Button Component with States and Animations
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { UserPlus, UserMinus, UserCheck } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/theme-context';
import { useButtonAnimation } from '@/hooks/useAnimation';
import { useFollow } from '@/hooks/useFollow';

interface FollowButtonProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary';
  showIcon?: boolean;
  style?: any;
}

export function FollowButton({ 
  userId, 
  size = 'medium', 
  variant = 'primary',
  showIcon = true,
  style 
}: FollowButtonProps) {
  const { theme } = useTheme();
  const buttonAnimation = useButtonAnimation();
  const { isFollowing, isLoading, toggleFollow } = useFollow(userId);

  const handlePress = () => {
    buttonAnimation.celebrate();
    toggleFollow();
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return { height: 32, paddingHorizontal: 12, fontSize: 14 };
      case 'large':
        return { height: 48, paddingHorizontal: 20, fontSize: 16 };
      default:
        return { height: 40, paddingHorizontal: 16, fontSize: 15 };
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Chargement...';
    return isFollowing ? 'Suivi' : 'Suivre';
  };

  const getButtonIcon = () => {
    if (!showIcon) return null;
    
    const iconSize = size === 'small' ? 16 : 20;
    const iconColor = variant === 'primary' ? theme.text.inverted : theme.color.brand[600];
    
    if (isLoading) return null;
    if (isFollowing) return <UserCheck size={iconSize} color={iconColor} />;
    return <UserPlus size={iconSize} color={iconColor} />;
  };

  const buttonSize = getButtonSize();
  const buttonText = getButtonText();
  const buttonIcon = getButtonIcon();

  const containerStyle = [
    styles.container,
    {
      height: buttonSize.height,
      paddingHorizontal: buttonSize.paddingHorizontal,
      borderRadius: theme.radius.lg,
      ...theme.elevation[1],
    },
    isFollowing && variant === 'secondary' && {
      backgroundColor: theme.color.success[50],
      borderColor: theme.color.success[500],
      borderWidth: 1,
    },
    style,
  ];

  const textStyle = [
    styles.text,
    {
      fontSize: buttonSize.fontSize,
      fontFamily: theme.typography.fontFamily,
      fontWeight: theme.typography.weights.semibold,
    },
    variant === 'secondary' && {
      color: isFollowing ? theme.color.success[600] : theme.color.brand[600],
    },
  ];

  if (variant === 'primary') {
    return (
      <Animated.View style={[buttonAnimation.animatedStyle, containerStyle]}>
        <LinearGradient
          colors={isFollowing 
            ? [theme.color.success[500], theme.color.success[600]]
            : [theme.color.brand[600], theme.color.brand[700]]
          }
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.lg }]}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          disabled={isLoading}
          activeOpacity={0.9}
        >
          <Animated.View style={styles.content}>
            {buttonIcon}
            <Text style={[textStyle, { color: theme.text.inverted, marginLeft: buttonIcon ? 8 : 0 }]}>
              {buttonText}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[buttonAnimation.animatedStyle, containerStyle, {
      backgroundColor: isFollowing ? theme.color.success[50] : theme.surface.container,
      borderColor: isFollowing ? theme.color.success[500] : theme.color.brand[600],
      borderWidth: 1,
    }]}>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={0.9}
      >
        <Animated.View style={styles.content}>
          {buttonIcon}
          <Text style={[textStyle, { marginLeft: buttonIcon ? 8 : 0 }]}>
            {buttonText}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});