import { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useCallback } from 'react';
import { AnimationConfig, AnimationPatterns } from '@/utils/animations';

// Hook for button animations
export function useButtonAnimation() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const pressIn = useCallback(() => {
    scale.value = withSpring(0.98, AnimationConfig.spring.gentle);
  }, [scale]);

  const pressOut = useCallback(() => {
    scale.value = withSpring(1, AnimationConfig.spring.gentle);
  }, [scale]);

  const celebrate = useCallback(() => {
    scale.value = withSpring(1.1, AnimationConfig.spring.bouncy);
    setTimeout(() => {
      scale.value = withSpring(1, AnimationConfig.spring.gentle);
    }, 200);
  }, [scale]);

  return {
    animatedStyle,
    pressIn,
    pressOut,
    celebrate,
    scale,
    opacity,
  };
}

// Hook for card animations
export function useCardAnimation() {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.08);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const lift = useCallback(() => {
    AnimationPatterns.cardLift(scale, shadowOpacity);
  }, [scale, shadowOpacity]);

  const return_ = useCallback(() => {
    AnimationPatterns.cardReturn(scale, shadowOpacity);
  }, [scale, shadowOpacity]);

  const press = useCallback(() => {
    scale.value = withSpring(0.99, AnimationConfig.spring.gentle);
    shadowOpacity.value = withTiming(0.04, { duration: AnimationConfig.timing.fast });
  }, [scale, shadowOpacity]);

  const release = useCallback(() => {
    scale.value = withSpring(1, AnimationConfig.spring.gentle);
    shadowOpacity.value = withTiming(0.08, { duration: AnimationConfig.timing.fast });
  }, [scale, shadowOpacity]);

  return {
    animatedStyle,
    lift,
    return: return_,
    press,
    release,
    scale,
    shadowOpacity,
  };
}

// Hook for fade animations
export function useFadeAnimation(initialValue = 0) {
  const opacity = useSharedValue(initialValue);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fadeIn = useCallback((delay = 0) => {
    AnimationPatterns.fadeIn(opacity, delay);
  }, [opacity]);

  const fadeOut = useCallback((delay = 0) => {
    opacity.value = withTiming(0, { duration: AnimationConfig.timing.normal });
  }, [opacity]);

  return {
    animatedStyle,
    fadeIn,
    fadeOut,
    opacity,
  };
}

// Hook for slide animations
export function useSlideAnimation(initialValue = 100) {
  const translateY = useSharedValue(initialValue);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const slideIn = useCallback((delay = 0) => {
    AnimationPatterns.slideInUp(translateY, delay);
    AnimationPatterns.fadeIn(opacity, delay);
  }, [translateY, opacity]);

  const slideOut = useCallback(() => {
    translateY.value = withSpring(100, AnimationConfig.spring.gentle);
    opacity.value = withTiming(0, { duration: AnimationConfig.timing.normal });
  }, [translateY, opacity]);

  return {
    animatedStyle,
    slideIn,
    slideOut,
    translateY,
    opacity,
  };
}

// Hook for scale animations
export function useScaleAnimation(initialValue = 0) {
  const scale = useSharedValue(initialValue);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const scaleIn = useCallback((delay = 0) => {
    AnimationPatterns.scaleIn(scale, delay);
    AnimationPatterns.fadeIn(opacity, delay);
  }, [scale, opacity]);

  const scaleOut = useCallback(() => {
    scale.value = withTiming(0, { duration: AnimationConfig.timing.fast });
    opacity.value = withTiming(0, { duration: AnimationConfig.timing.fast });
  }, [scale, opacity]);

  return {
    animatedStyle,
    scaleIn,
    scaleOut,
    scale,
    opacity,
  };
}

// Hook for loading animations
export function useLoadingAnimation() {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const startPulse = useCallback(() => {
    AnimationPatterns.pulse(opacity);
  }, [opacity]);

  const stopPulse = useCallback(() => {
    opacity.value = withTiming(1, { duration: AnimationConfig.timing.fast });
  }, [opacity]);

  return {
    animatedStyle,
    startPulse,
    stopPulse,
    opacity,
    scale,
  };
}

// Hook for list item animations
export function useListItemAnimation(index: number) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const enter = useCallback(() => {
    AnimationPatterns.staggeredFadeIn(opacity, index);
    translateY.value = withSpring(0, {
      ...AnimationConfig.spring.gentle,
      delay: index * 50,
    });
  }, [opacity, translateY, index]);

  return {
    animatedStyle,
    enter,
    opacity,
    translateY,
  };
}