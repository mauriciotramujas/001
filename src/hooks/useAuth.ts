import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { clearEvolutionConfig } from '../api/evolution';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function handleSession(current: Session | null) {
      setLoading(true);
      setSession(current);
      if (!current) {
        clearEvolutionConfig();
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => handleSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const result = await supabase.auth.signInWithPassword({ email, password });
    return result;
  }

  async function signUp(email: string, password: string) {
    const result = await supabase.auth.signUp({ email, password });
    return result;
  }

  function signOut() {
    clearEvolutionConfig();
    return supabase.auth.signOut();
  }

  return { session, loading, signIn, signUp, signOut };
}
