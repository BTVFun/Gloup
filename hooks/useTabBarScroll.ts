import { useRef, useState } from 'react';
import { Animated } from 'react-native';

export function useTabBarScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const scrollDiff = currentScrollY - lastScrollY.current;
        
        // Tab bar height (adjust based on your tab bar height)
        const TAB_BAR_HEIGHT = 84;
        
        if (scrollDiff > 5 && currentScrollY > TAB_BAR_HEIGHT && isTabBarVisible) {
          // Scrolling down - hide tab bar
          Animated.timing(tabBarTranslateY, {
            toValue: TAB_BAR_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start();
          setIsTabBarVisible(false);
        } else if (scrollDiff < -5 && !isTabBarVisible) {
          // Scrolling up - show tab bar
          Animated.timing(tabBarTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
          setIsTabBarVisible(true);
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  return {
    tabBarTranslateY,
    onScroll,
    isTabBarVisible,
  };
}