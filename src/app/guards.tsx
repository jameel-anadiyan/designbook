import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/features/auth/auth-context';
import { Logo } from '@/components/ui/misc';
import type { AppRole } from '@/lib/supabase';

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-white" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-6">
        <Logo className="h-28 w-auto animate-fade-in" />
        <div className="h-0.5 w-32 overflow-hidden rounded-full bg-teal-100">
          <div className="h-full w-1/2 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full bg-teal-500 [background-size:200%_100%]" style={{ animationName: 'slide' }} />
        </div>
      </div>
      <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
    </div>
  );
}

/** Signed-in + active profile. Forces /change-passcode while must_change_password is true. */
export function RequireAuth() {
  const { loading, session, profile } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!session || !profile || !profile.active) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (profile.must_change_password && location.pathname !== '/change-passcode') {
    return <Navigate to="/change-passcode" replace />;
  }
  return <Outlet />;
}

export function RequireRole({ roles, children }: { roles: AppRole[]; children?: ReactNode }) {
  const { profile } = useAuth();
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return children ? <>{children}</> : <Outlet />;
}

/** Login page: bounce signed-in users home. */
export function PublicOnly() {
  const { loading, session, profile } = useAuth();
  if (loading) return <Splash />;
  if (session && profile?.active) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { profile } = useAuth();
  return <Navigate to={profile?.role === 'shop_user' ? '/designs' : '/dashboard'} replace />;
}
