import { useEffect } from 'react';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export default function RootLayout() {
  useFrameworkReady();
  const { session, isLoading } = useSupabaseAuth();

  if (isLoading) {
    return null;
  }

  return (
    <>
      {session ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
        </Stack>
      )}
      <StatusBar style="auto" />
    </>
  );
}
