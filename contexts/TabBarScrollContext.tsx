import React, { createContext, useContext } from 'react';
import { useTabBarScroll } from '@/hooks/useTabBarScroll';

interface TabBarScrollContextType {
  onScroll: any;
  tabBarTranslateY: any;
  isTabBarVisible: boolean;
}

const TabBarScrollContext = createContext<TabBarScrollContextType | null>(null);

export function TabBarScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollData = useTabBarScroll();
  
  return (
    <TabBarScrollContext.Provider value={scrollData}>
      {children}
    </TabBarScrollContext.Provider>
  );
}

export function useTabBarScrollContext() {
  const context = useContext(TabBarScrollContext);
  if (!context) {
    throw new Error('useTabBarScrollContext must be used within TabBarScrollProvider');
  }
  return context;
}