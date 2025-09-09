import { supabase } from '@/lib/supabase';

export async function ensureProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const { data, error } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (error) {
    console.error('Erreur lors de la vérification du profil:', error);
    return;
  }
  
  if (!data) {
    const { error: insertError } = await supabase.from('profiles').insert({ 
      id: user.id,
      username: user.email?.split('@')[0] || 'utilisateur',
      full_name: user.user_metadata?.full_name || null,
    });
    
    if (insertError) {
      console.error('Erreur lors de la création du profil:', insertError);
    }
  }
}

