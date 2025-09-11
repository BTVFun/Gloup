import { useRef, useState } from 'react';
import { Animated } from 'react-native';

export function useHeaderScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const scrollDiff = currentScrollY - lastScrollY.current;
        
        // Header height (adjust based on your header height)
        const HEADER_HEIGHT = 100;
        
        if (scrollDiff > 5 && currentScrollY > HEADER_HEIGHT && isHeaderVisible) {
          // Scrolling down - hide header
          Animated.timing(headerTranslateY, {
            toValue: -HEADER_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start();
          setIsHeaderVisible(false);
        } else if (scrollDiff < -5 && !isHeaderVisible) {
          // Scrolling up - show header
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
          setIsHeaderVisible(true);
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  return {
    headerTranslateY,
    onScroll,
    isHeaderVisible,
  };
}