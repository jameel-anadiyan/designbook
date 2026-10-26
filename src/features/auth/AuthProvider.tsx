import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { callFunction } from '@/lib/api';
import { AuthContext, type AuthState } from './auth-context';

type LoginResponse = {
  session: { access_token: string; refresh_token: string };
  must_change_password: boolean;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const profileQ = useQuery({
    queryKey: ['me', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const outletQ = useQuery({
    queryKey: ['outlet', profileQ.data?.outlet_id],
    enabled: !!profileQ.data?.outlet_id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('outlets').select('*').eq('id', profileQ.data!.outlet_id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // A disabled account (or missing profile) must not keep a session.
  useEffect(() => {
    if (userId && profileQ.isSuccess && (!profileQ.data || !profileQ.data.active)) {
      supabase.auth.signOut();
    }
  }, [userId, profileQ.isSuccess, profileQ.data]);

  const signIn = useCallback(async (username: string, passcode: string) => {
    const res = await callFunction<LoginResponse>('login-by-username', { username, passcode });
    const { error } = await supabase.auth.setSession(res.session);
    if (error) throw error;
    return { mustChange: res.must_change_password };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    qc.clear();
  }, [qc]);

  const refreshProfile = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['me'] });
  }, [qc]);

  const value = useMemo<AuthState>(
    () => ({
      loading: booting || (!!userId && profileQ.isLoading),
      session,
      profile: profileQ.data ?? null,
      outlet: outletQ.data ?? null,
      signIn,
      signOut,
      refreshProfile,
    }),
    [booting, userId, profileQ.isLoading, profileQ.data, outletQ.data, session, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
