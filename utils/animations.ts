import { withSpring, withTiming, withSequence, withDelay, withRepeat } from 'react-native-reanimated';

// Animation configurations based on design system
export const AnimationConfig = {
  // Timing configurations
  timing: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // Spring configurations
  spring: {
    gentle: { damping: 15, stiffness: 300, mass: 1 },
    bouncy: { damping: 8, stiffness: 200, mass: 1 },
    snappy: { damping: 20, stiffness: 400, mass: 1 },
  },
  
  // Easing curves
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Reusable animation patterns
export const AnimationPatterns = {
  // Button press animation
  buttonPress: (scale: any, config = AnimationConfig.spring.gentle) => {
    'worklet';
    return withSequence(
      withSpring(0.98, config),
      withSpring(1, config)
    );
  },

  // Success celebration
  celebrate: (scale: any, rotation: any) => {
    'worklet';
    scale.value = withSequence(
      withSpring(1.2, { damping: 2, stiffness: 200 }),
      withSpring(0.9, { damping: 5, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    rotation.value = withSequence(
      withTiming(10, { duration: 100 }),
      withTiming(-10, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
  },

  // Shake animation for errors
  shake: (translateX: any) => {
    'worklet';
    return withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  },

  // Pulse animation for loading
  pulse: (opacity: any) => {
    'worklet';
    return withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );
  },

  // Fade in animation
  fadeIn: (opacity: any, delay = 0) => {
    'worklet';
    return withDelay(
      delay,
      withTiming(1, { duration: AnimationConfig.timing.normal })
    );
  },

  // Slide in from bottom
  slideInUp: (translateY: any, delay = 0) => {
    'worklet';
    return withDelay(
      delay,
      withSpring(0, AnimationConfig.spring.gentle)
    );
  },

  // Scale in animation
  scaleIn: (scale: any, delay = 0) => {
    'worklet';
    return withDelay(
      delay,
      withSpring(1, AnimationConfig.spring.bouncy)
    );
  },

  // Staggered list animation
  staggeredFadeIn: (opacity: any, index: number, staggerDelay = 50) => {
    'worklet';
    return withDelay(
      index * staggerDelay,
      withTiming(1, { duration: AnimationConfig.timing.normal })
    );
  },

  // Card hover lift
  cardLift: (scale: any, shadowOpacity: any) => {
    'worklet';
    scale.value = withSpring(1.02, AnimationConfig.spring.gentle);
    shadowOpacity.value = withTiming(0.15, { duration: AnimationConfig.timing.fast });
  },

  // Card hover return
  cardReturn: (scale: any, shadowOpacity: any, originalShadow = 0.08) => {
    'worklet';
    scale.value = withSpring(1, AnimationConfig.spring.gentle);
    shadowOpacity.value = withTiming(originalShadow, { duration: AnimationConfig.timing.fast });
  },

  // Loading dots animation
  loadingDots: (translateY: any, index: number) => {
    'worklet';
    return withDelay(
      index * 100,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 400 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        false
      )
    );
  },

  // Heart like animation
  heartLike: (scale: any) => {
    'worklet';
    return withSequence(
      withSpring(1.3, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
  },

  // Tab switch animation
  tabSwitch: (translateX: any, targetX: number) => {
    'worklet';
    return withSpring(targetX, AnimationConfig.spring.snappy);
  },

  // Modal present animation
  modalPresent: (scale: any, opacity: any) => {
    'worklet';
    scale.value = withSpring(1, AnimationConfig.spring.gentle);
    opacity.value = withTiming(1, { duration: AnimationConfig.timing.normal });
  },

  // Modal dismiss animation
  modalDismiss: (scale: any, opacity: any) => {
    'worklet';
    scale.value = withTiming(0.9, { duration: AnimationConfig.timing.fast });
    opacity.value = withTiming(0, { duration: AnimationConfig.timing.fast });
  },
};

// Utility functions for common animation patterns
export const createStaggeredAnimation = (
  items: any[],
  animationFn: (item: any, index: number) => void,
  staggerDelay = 50
) => {
  items.forEach((item, index) => {
    setTimeout(() => animationFn(item, index), index * staggerDelay);
  });
};

export const createSequentialAnimation = (
  animations: (() => void)[],
  delay = 100
) => {
  animations.forEach((animation, index) => {
    setTimeout(animation, index * delay);
  });
};