import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme-context';

interface CustomHeaderProps {
  title: string;
  translateY: Animated.Value;
}

export function CustomHeader({ title, translateY }: CustomHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View 
      style={[
        styles.headerContainer,
        {
          paddingTop: insets.top,
          transform: [{ translateY }],
        }
      ]}
    >
      <BlurView 
        tint="light" 
        intensity={80} 
        style={StyleSheet.absoluteFill} 
      />
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, { color: theme.color.brand[600] }]}>
          {title}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  headerContent: {
    height: 44, // Compact header as specified in design
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});