import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = (Constants.expoConfig?.extra ?? {}) as {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Conseillé: les définir via app.config.ts -> extra et EAS secrets
  console.warn('Supabase config manquante: définissez SUPABASE_URL et SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

