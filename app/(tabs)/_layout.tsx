import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { AnimatedTabBar } from '@/components/ui/AnimatedTabBar';
import { useTabBarScroll } from '@/hooks/useTabBarScroll';
import { TabBarScrollProvider } from '@/contexts/TabBarScrollContext';

export default function TabLayout() {
  const { tabBarTranslateY } = useTabBarScroll();

  return (
    <TabBarScrollProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
          }}
          tabBar={(props) => (
            <AnimatedTabBar {...props} translateY={tabBarTranslateY} />
          )}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Gloup',
              tabBarAccessibilityLabel: 'Fil d\'actualité',
            }}
          />
          <Tabs.Screen
            name="conseils"
            options={{
              title: 'Conseils',
              tabBarAccessibilityLabel: 'Conseils et articles',
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              title: 'Messages',
              tabBarAccessibilityLabel: 'Messages et groupes',
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profil',
              tabBarAccessibilityLabel: 'Mon profil',
            }}
          />
          
          {/* Hidden screens */}
          <Tabs.Screen 
            name="create" 
            options={{ 
              href: null
            }} 
          />
          <Tabs.Screen 
            name="profile-edit" 
            options={{ 
              href: null
            }} 
          />
          <Tabs.Screen 
            name="create-group" 
            options={{ 
              href: null
            }} 
          />
          <Tabs.Screen 
            name="chat" 
            options={{ 
              href: null
            }} 
          />
          <Tabs.Screen 
            name="group" 
            options={{ 
              href: null
            }} 
          />
          <Tabs.Screen 
            name="chat/[id]" 
            options={{ 
              href: null
            }} 
          />
          <Tabs.Screen 
            name="group/[id]" 
            options={{ 
              href: null
            }} 
          />
        </Tabs>
      </View>
    </TabBarScrollProvider>
  );
}