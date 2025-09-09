import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'gloup',
  slug: 'gloup',
  scheme: 'gloup',
  newArchEnabled: true,
  userInterfaceStyle: 'automatic',
  plugins: ['expo-router', 'expo-font', 'expo-web-browser'],
  web: { bundler: 'metro', output: 'single', favicon: './assets/images/favicon.png' },
  ios: { supportsTablet: true },
  extra: {
    // Clés injectées pour dev sur gloup-prod (à retirer avant release)
    SUPABASE_URL: 'https://qsoutgrmvpyrazuygoeo.supabase.co',
    SUPABASE_ANON_KEY:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzb3V0Z3JtdnB5cmF6dXlnb2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjY4OTIsImV4cCI6MjA3MzAwMjg5Mn0.6-OFiWeus-Z-4PV8-6BAhGZSS2LrN9GQKnTKqekMKNk',
  },
  experiments: { typedRoutes: true },
};

export default config;
