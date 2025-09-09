import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useSupabaseAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
}

