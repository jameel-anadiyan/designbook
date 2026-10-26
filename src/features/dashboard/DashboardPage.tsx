import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Gem, Hourglass, ImageOff, PauseCircle, ReceiptIndianRupee, Truck, Upload, Users, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, StatCard } from '@/components/ui/misc';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/auth-context';

async function count(build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) {
  const { count: c, error } = await build(base());
  if (error) throw error;
  return c ?? 0;
}
const base = () => supabase.from('designs_v').select('id', { count: 'exact', head: true });

function useDashboardCounts() {
  return useQuery({
    queryKey: ['dashboard', 'counts'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const [total, inTransfer, atHo, onHold, soldMonth, corrections, votes] = await Promise.all([
        count((q) => q.neq('status', 'sold')),
        count((q) => q.eq('status', 'in_transfer')),
        count((q) => q.eq('at_head_office', true).neq('status', 'sold')),
        count((q) => q.eq('status', 'on_hold')),
        count((q) => q.eq('status', 'sold').gte('sold_at', monthStart.toISOString())),
        count((q) => q.eq('media_flag', true)),
        count((q) => q.gt('unclear_votes', 0)),
      ]);
      return { total, inTransfer, atHo, onHold, soldMonth, corrections, votes };
    },
  });
}

export function DashboardPage() {
  const { profile } = useAuth();
  const { data, isLoading } = useDashboardCounts();
  const v = (n?: number) => (isLoading ? '–' : (n ?? 0).toLocaleString('en-IN'));
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }).format(new Date())}
        title={`${greet}, ${profile?.full_name?.split(' ')[0] ?? ''}`}
        description="A live view of stock across every outlet."
        actions={
          <Button asChild variant="secondary">
            <Link to="/designs">Browse designs <ArrowRight /></Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Designs in stock" value={v(data?.total)} icon={<Gem />} hint="All outlets, unsold" />
        <StatCard label="In transfer" value={v(data?.inTransfer)} icon={<Truck />} hint="Accepted → received" />
        <StatCard label="At Head Office" value={v(data?.atHo)} icon={<Warehouse />} hint="Waiting to dispatch" />
        <StatCard label="On hold" value={v(data?.onHold)} icon={<PauseCircle />} hint="Numbered holds" />
        <StatCard label="Sold this month" value={v(data?.soldMonth)} icon={<ReceiptIndianRupee />} hint="With invoice" />
        <StatCard label="Image corrections" value={v(data?.corrections)} icon={<ImageOff />} hint="Open requests" />
        <StatCard label="Unclear-image votes" value={v(data?.votes)} icon={<Hourglass />} hint="Designs with open votes" />
        <Link
          to={profile?.role === 'super_admin' ? '/admin/users' : '/upload'}
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 p-4 text-white shadow-lift transition hover:-translate-y-0.5 sm:p-5"
        >
          <svg className="absolute -bottom-6 -right-6 size-32 text-white/10 transition group-hover:rotate-6" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M50 5 85 35 50 95 15 35Z M15 35h70 M32 35l18-30 18 30 M32 35l18 60 18-60" />
          </svg>
          <p className="label-caps relative text-teal-100">Quick action</p>
          <p className="relative mt-2 flex items-center gap-2 font-serif text-2xl font-semibold">
            {profile?.role === 'super_admin' ? <><Users className="size-6" /> Manage users</> : <><Upload className="size-6" /> Upload design</>}
          </p>
          <ArrowRight className="relative mt-3 size-5 transition group-hover:translate-x-1" />
        </Link>
      </div>

      <section className="mt-8 rounded-3xl border border-line bg-gradient-to-br from-teal-50 to-white p-6 sm:p-8">
        <p className="label-caps text-teal-600">Getting started</p>
        <h2 className="mt-1 text-3xl">Set up Design Book in three steps</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { n: 1, t: 'Name your outlets', d: 'Rename the placeholder outlets and add any missing shops.', to: '/admin/outlets', admin: true },
            { n: 2, t: 'Review categories', d: 'Rings, necklaces, earrings… add the ones you sell.', to: '/admin/categories' },
            { n: 3, t: 'Create users', d: 'One account per person; share temp passcodes privately.', to: '/admin/users', admin: true },
          ]
            .filter((s) => !s.admin || profile?.role === 'super_admin')
            .map((s) => (
              <li key={s.n}>
                <Link to={s.to} className="group flex h-full gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-teal-200 hover:shadow-soft">
                  <span className="tabular grid size-8 shrink-0 place-items-center rounded-full bg-teal-600 font-medium text-white">{s.n}</span>
                  <span>
                    <span className="block font-medium text-teal-800 group-hover:text-teal-600">{s.t}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{s.d}</span>
                  </span>
                </Link>
              </li>
            ))}
        </ol>
      </section>
    </>
  );
}
