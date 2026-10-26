import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Bell, ChevronsLeft, ChevronsRight, LogOut, MoreHorizontal, Plus, UserRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Avatar, Logo } from '@/components/ui/misc';
import { Sheet } from '@/components/ui/dialog';
import { useAuth } from '@/features/auth/auth-context';
import { navFor, type NavItem } from './nav';

function useUnreadCount(userId?: string) {
  const q = useQuery({
    queryKey: ['notifications', 'unread', userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
  // live updates (Supabase Realtime) — the bell refreshes on every new notification
  const { refetch } = q;
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notif-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, refetch]);
  return q.data ?? 0;
}

function CountDot({ n, className }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span
      className={cn(
        'tabular grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-teal-600 px-1 text-[0.65rem] font-semibold text-white ring-2 ring-white',
        className,
      )}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}

export function AppShell() {
  const { profile, outlet, signOut } = useAuth();
  const nav = navFor(profile?.role);
  const unread = useUnreadCount(profile?.id);
  const [railOpen, setRailOpen] = useState(() => localStorage.getItem('db:rail') === 'open');
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => localStorage.setItem('db:rail', railOpen ? 'open' : 'closed'), [railOpen]);

  const badgeFor = (item: NavItem) => (item.badge === 'notifications' ? unread : 0);
  const outletLabel = profile?.role === 'shop_user' ? outlet?.name : ROLE_LABEL[profile?.role ?? 'head_office'];

  const sideLink = (item: NavItem, expanded: boolean) => (
    <NavLink
      key={item.to}
      to={item.to}
      id={`nav-${item.to.replaceAll('/', '-').slice(1)}`}
      title={expanded ? undefined : item.label}
      className={({ isActive }) =>
        cn(
          'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] transition-colors duration-150',
          isActive ? 'bg-teal-100 font-medium text-teal-700' : 'text-ink-soft hover:bg-teal-50 hover:text-teal-700',
          !expanded && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-2 h-7 w-1 rounded-r-full bg-teal-600" aria-hidden />}
          <span className="relative">
            <item.icon className="size-5" strokeWidth={isActive ? 2 : 1.6} />
            {!expanded && <CountDot n={badgeFor(item)} className="absolute -right-2.5 -top-2" />}
          </span>
          {expanded && <span className="flex-1 truncate">{item.label}</span>}
          {expanded && <CountDot n={badgeFor(item)} />}
        </>
      )}
    </NavLink>
  );

  const sidebar = (expanded: boolean) => (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-20 items-center', expanded ? 'px-5' : 'justify-center')}>
        <Link to="/" aria-label="Design Book home" className="flex items-center gap-3">
          {expanded ? (
            <>
              <Logo variant="mark" className="h-9 w-auto" />
              <span className="leading-none">
                <span className="block font-serif text-xl font-semibold text-teal-700">Design Book</span>
                <span className="label-caps mt-1 block text-[0.6rem] text-teal-600">SWA Diamonds</span>
              </span>
            </>
          ) : (
            <Logo variant="mark" className="h-8 w-auto" />
          )}
        </Link>
      </div>

      <Link
        to="/upload"
        id="sidebar-upload"
        className={cn(
          'mx-3 mb-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 font-medium text-white shadow-[0_8px_20px_-8px_rgb(1_116_128/0.6)] transition hover:bg-teal-700 active:scale-[0.98]',
        )}
        title="Upload a design"
      >
        <Plus className="size-5" />
        {expanded && 'Upload design'}
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
        {nav.main.filter((n) => n.to !== '/upload').map((item) => sideLink(item, expanded))}
        {nav.admin.length > 0 && (
          <>
            <div className={cn('pb-1 pt-5', expanded ? 'px-3' : 'px-0 text-center')}>
              {expanded ? <p className="label-caps text-[0.6rem]">Administration</p> : <div className="hairline-gradient" />}
            </div>
            {nav.admin.map((item) => sideLink(item, expanded))}
          </>
        )}
      </nav>

      <div className="border-t border-line p-3">
        <UserMenu expanded={expanded} outletLabel={outletLabel} onSignOut={signOut} />
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-white">
      {/* Desktop ≥1024: labelled sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-gradient-to-b from-white to-teal-50/50 lg:block">
        {sidebar(true)}
      </aside>

      {/* Tablet 640–1023: icon rail that expands to labels */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-white/95 backdrop-blur transition-[width] duration-200 ease-out sm:block lg:hidden',
          railOpen ? 'w-64 shadow-lift' : 'w-[4.5rem]',
        )}
      >
        {sidebar(railOpen)}
        <button
          id="rail-toggle"
          onClick={() => setRailOpen((o) => !o)}
          className="absolute -right-3.5 top-24 grid size-7 place-items-center rounded-full border border-line bg-white text-teal-600 shadow-soft hover:bg-teal-50"
          aria-label={railOpen ? 'Collapse menu' : 'Expand menu'}
        >
          {railOpen ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />}
        </button>
      </aside>
      {railOpen && <div className="fixed inset-0 z-20 hidden bg-white/40 sm:block lg:hidden" onClick={() => setRailOpen(false)} />}

      {/* Phone <640: top bar with centred logo */}
      <header className="pt-safe sticky top-0 z-30 border-b border-line/70 bg-white/90 backdrop-blur-md sm:hidden">
        <div className="grid h-14 grid-cols-[3rem_1fr_3rem] items-center px-2">
          <button
            id="mobile-profile"
            onClick={() => navigate('/profile')}
            className="grid size-11 place-items-center rounded-full"
            aria-label="Profile"
          >
            <Avatar name={profile?.full_name} className="size-8" />
          </button>
          <Link to="/" className="justify-self-center" aria-label="Design Book home">
            <Logo variant="mark" className="h-8 w-auto" />
          </Link>
          <Link to="/notifications" id="mobile-bell" className="relative grid size-11 place-items-center rounded-full text-teal-700" aria-label={`Notifications (${unread} unread)`}>
            <Bell className="size-5" strokeWidth={1.7} />
            <CountDot n={unread} className="absolute right-1.5 top-1.5" />
          </Link>
        </div>
      </header>

      <main className="sm:pl-[4.5rem] lg:pl-64">
        <div className="mx-auto w-full max-w-[1400px] px-4 pb-32 pt-5 sm:px-6 sm:pb-12 sm:pt-8 lg:px-10">
          <Outlet />
        </div>
      </main>

      {/* Phone: floating Upload + bottom tab bar */}
      <Link
        to="/upload"
        id="fab-upload"
        aria-label="Upload a design"
        className="fixed bottom-[calc(4.75rem+var(--safe-bottom))] right-4 z-40 grid size-14 place-items-center rounded-full bg-teal-600 text-white shadow-[0_12px_28px_-8px_rgb(1_116_128/0.7)] ring-4 ring-white transition active:scale-95 sm:hidden"
      >
        <Plus className="size-6" strokeWidth={2.2} />
      </Link>
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur-md sm:hidden"
        aria-label="Primary"
      >
        <ul className="grid h-16 grid-cols-5">
          {nav.tabs.slice(0, 4).map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                id={`tab-${item.to.replaceAll('/', '-').slice(1)}`}
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-col items-center justify-center gap-1 text-[0.68rem] font-medium tracking-wide transition-colors',
                    isActive ? 'text-teal-700' : 'text-ink-faint',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('relative grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'bg-teal-100')}>
                      <item.icon className="size-5" strokeWidth={isActive ? 2 : 1.6} />
                      <CountDot n={badgeFor(item)} className="absolute -right-0.5 -top-1" />
                    </span>
                    {item.short ?? item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              id="tab-more"
              onClick={() => setMoreOpen(true)}
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-[0.68rem] font-medium tracking-wide text-ink-faint"
            >
              <span className="grid h-7 w-12 place-items-center rounded-full">
                <MoreHorizontal className="size-5" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title="Menu" side="bottom" id="more-sheet">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-teal-50 p-3">
          <Avatar name={profile?.full_name} className="size-11" />
          <div className="min-w-0">
            <p className="truncate font-medium text-teal-800">{profile?.full_name}</p>
            <p className="truncate text-sm text-ink-soft">
              @{profile?.username} · {outletLabel}
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-2">
          {nav.more.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-line text-center text-sm text-teal-800 transition active:bg-teal-50"
              >
                <item.icon className="size-6 text-teal-600" strokeWidth={1.6} />
                <span className="px-1 leading-tight">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <button
          id="more-signout"
          onClick={signOut}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line text-teal-700"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </Sheet>
    </div>
  );
}

function UserMenu({ expanded, outletLabel, onSignOut }: { expanded: boolean; outletLabel?: string | null; onSignOut: () => void }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  return (
    <DM.Root>
      <DM.Trigger
        id="user-menu"
        className={cn(
          'flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-teal-50 data-[state=open]:bg-teal-50',
          !expanded && 'justify-center',
        )}
      >
        <Avatar name={profile?.full_name} />
        {expanded && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-teal-800">{profile?.full_name}</span>
            <span className="block truncate text-xs text-ink-soft">{outletLabel}</span>
          </span>
        )}
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 w-60 animate-rise rounded-2xl border border-line bg-white p-1.5 shadow-lift"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-teal-800">@{profile?.username}</p>
            <p className="text-xs text-ink-soft">{ROLE_LABEL[profile?.role ?? 'shop_user']}</p>
          </div>
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item
            onSelect={() => navigate('/profile')}
            className="flex h-10 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm text-teal-800 outline-none data-[highlighted]:bg-teal-50"
          >
            <UserRound className="size-4 text-teal-600" /> Profile & passcode
          </DM.Item>
          <DM.Item
            onSelect={onSignOut}
            id="signout"
            className="flex h-10 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm text-teal-800 outline-none data-[highlighted]:bg-teal-50"
          >
            <LogOut className="size-4 text-teal-600" /> Sign out
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
