import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Outlet, Profile } from '@/lib/supabase';

export type AuthState = {
  /** true until the stored session (and profile, if signed in) has loaded */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  outlet: Outlet | null;
  signIn: (username: string, passcode: string) => Promise<{ mustChange: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function useRole() {
  const { profile } = useAuth();
  const role = profile?.role ?? null;
  return {
    role,
    isAdmin: role === 'super_admin',
    isStaff: role === 'super_admin' || role === 'head_office',
    isShop: role === 'shop_user',
  };
}
