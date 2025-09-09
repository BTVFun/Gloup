import { supabase } from '@/lib/supabase';

export async function ensureProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data, error } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (error) return; // silencieux v1
  if (!data) {
    await supabase.from('profiles').insert({ id: user.id });
  }
}

