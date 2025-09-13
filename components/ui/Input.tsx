import React, { useState, useCallback } from 'react';
import { View, TextInput, Text, StyleSheet, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  withSpring,
  interpolateColor 
} from 'react-native-reanimated';
import { useTheme } from '@/lib/theme-context';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  success?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: any;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  success = false,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  style,
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  const focusProgress = useSharedValue(0);
  const borderColor = useSharedValue(0);
  const labelScale = useSharedValue(value ? 1 : 0.85);
  const labelTranslateY = useSharedValue(value ? -20 : 0);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColorValue = interpolateColor(
      borderColor.value,
      [0, 1, 2],
      [
        theme.surface.border,
        theme.color.brand[500],
        error ? theme.color.danger[500] : theme.color.success[500]
      ]
    );

    return {
      borderColor: borderColorValue,
      borderWidth: withTiming(isFocused ? 2 : 1, { duration: theme.animations.timing.fast }),
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: labelScale.value },
      { translateY: labelTranslateY.value }
    ],
    color: interpolateColor(
      borderColor.value,
      [0, 1, 2],
      [theme.text.muted, theme.color.brand[600], error ? theme.color.danger[500] : theme.color.success[500]]
    ),
  }));

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: theme.animations.timing.normal });
    borderColor.value = withTiming(error ? 2 : success ? 2 : 1, { duration: theme.animations.timing.fast });
    
    if (label) {
      labelScale.value = withSpring(0.75, theme.animations.spring);
      labelTranslateY.value = withSpring(-20, theme.animations.spring);
    }
  }, [focusProgress, borderColor, labelScale, labelTranslateY, theme, error, success, label]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: theme.animations.timing.normal });
    borderColor.value = withTiming(error ? 2 : success ? 2 : 0, { duration: theme.animations.timing.fast });
    
    if (label && !value) {
      labelScale.value = withSpring(0.85, theme.animations.spring);
      labelTranslateY.value = withSpring(0, theme.animations.spring);
    }
  }, [focusProgress, borderColor, labelScale, labelTranslateY, theme, error, success, label, value]);

  const getInputHeight = () => {
    if (multiline) {
      return numberOfLines * 20 + 32; // Approximate line height + padding
    }
    return 48;
  };

  const containerStyle = [
    styles.container,
    {
      backgroundColor: theme.surface.container,
      borderRadius: theme.radius.md,
      minHeight: getInputHeight(),
      ...theme.elevation[0],
    },
    disabled && { opacity: 0.5 },
    style,
  ];

  const inputStyle = [
    styles.input,
    {
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.body.md,
      color: theme.text.primary,
      paddingLeft: leftIcon ? theme.space.xl + theme.space.sm : theme.space.md,
      paddingRight: rightIcon ? theme.space.xl + theme.space.sm : theme.space.md,
    },
    multiline && { textAlignVertical: 'top', paddingTop: theme.space.md },
  ];

  const labelStyle = [
    styles.label,
    {
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.body.sm,
      fontWeight: theme.typography.weights.medium,
      left: leftIcon ? theme.space.xl + theme.space.sm : theme.space.md,
    },
  ];

  return (
    <View style={styles.wrapper}>
      {label && (
        <Animated.Text style={[labelStyle, animatedLabelStyle]}>
          {label}
        </Animated.Text>
      )}
      
      <Animated.View style={[containerStyle, animatedContainerStyle]}>
        {leftIcon && (
          <View style={[styles.icon, styles.leftIcon, { left: theme.space.md }]}>
            {leftIcon}
          </View>
        )}
        
        <AnimatedTextInput
          style={inputStyle}
          placeholder={!label || (label && value) ? placeholder : undefined}
          placeholderTextColor={theme.text.muted}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          selectionColor={theme.color.brand[500]}
        />
        
        {rightIcon && (
          <View style={[styles.icon, styles.rightIcon, { right: theme.space.md }]}>
            {rightIcon}
          </View>
        )}
      </Animated.View>
      
      {(error || (maxLength && value.length > 0)) && (
        <View style={styles.footer}>
          {error && (
            <Text style={[styles.errorText, { color: theme.color.danger[500] }]}>
              {error}
            </Text>
          )}
          {maxLength && (
            <Text style={[styles.counterText, { color: theme.text.muted }]}>
              {value.length}/{maxLength}
            </Text>
          )}
        </View>
      )}
      
      {success && !error && (
        <Text style={[styles.successText, { color: theme.color.success[500] }]}>
          ✓ Parfait !
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  container: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    ...Platform.select({
      web: {
        outline: 'none',
      },
    }),
  },
  label: {
    position: 'absolute',
    top: 12,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  icon: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -12 }],
    zIndex: 1,
  },
  leftIcon: {
    left: 12,
  },
  rightIcon: {
    right: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  successText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  counterText: {
    fontSize: 12,
  },
});