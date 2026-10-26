import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as DM from '@radix-ui/react-dropdown-menu';
import { toast } from 'sonner';
import {
  Check, Copy, KeyRound, Lock, LockOpen, MoreVertical, Pencil, Plus, Search, ShieldAlert, UserCheck, UserX, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input';
import { Avatar, Badge, EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { callFunction } from '@/lib/api';
import { supabase, type AppRole, type Profile } from '@/lib/supabase';
import { formatDateTime, ROLE_LABEL, timeAgo } from '@/lib/format';
import { cn, errorMessage } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-context';
import { useOutlets } from '@/features/admin/queries';

const isLocked = (p: Profile) => !!p.locked_until && new Date(p.locked_until) > new Date();

function useUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function UsersPage() {
  const { profile: me } = useAuth();
  const usersQ = useUsers();
  const outletsQ = useOutlets();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);
  const [temp, setTemp] = useState<{ username: string; code: string; reason: 'created' | 'reset' } | null>(null);
  const [confirmReset, setConfirmReset] = useState<Profile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const outletName = useMemo(() => {
    const m = new Map((outletsQ.data ?? []).map((o) => [o.id, o.name]));
    return (id: string | null) => (id ? m.get(id) ?? '—' : '—');
  }, [outletsQ.data]);

  const users = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (usersQ.data ?? []).filter(
      (u) =>
        (roleFilter === 'all' || u.role === roleFilter) &&
        (!s ||
          u.full_name.toLowerCase().includes(s) ||
          u.username.includes(s) ||
          u.email.includes(s) ||
          u.phone.includes(s) ||
          outletName(u.outlet_id).toLowerCase().includes(s)),
    );
  }, [usersQ.data, q, roleFilter, outletName]);

  const counts = useMemo(() => {
    const all = usersQ.data ?? [];
    return {
      total: all.length,
      active: all.filter((u) => u.active).length,
      locked: all.filter(isLocked).length,
      pending: all.filter((u) => u.must_change_password).length,
    };
  }, [usersQ.data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  const act = async (u: Profile, body: Record<string, unknown>, success: string) => {
    setBusyId(u.id);
    try {
      await callFunction('admin-update-user', { user_id: u.id, ...body });
      toast.success(success);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const resetPasscode = async (u: Profile) => {
    setBusyId(u.id);
    try {
      const r = await callFunction<{ temp_passcode: string }>('admin-reset-password', { user_id: u.id });
      setTemp({ username: u.username, code: r.temp_passcode, reason: 'reset' });
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
      setConfirmReset(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Create accounts for every outlet. Temporary passcodes are shown once — share them privately."
        actions={
          <Button id="users-create" onClick={() => setEditing('new')}>
            <Plus /> New user
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', v: counts.total, icon: Users },
          { label: 'Active', v: counts.active, icon: UserCheck },
          { label: 'Locked now', v: counts.locked, icon: Lock },
          { label: 'Awaiting first sign-in', v: counts.pending, icon: KeyRound },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5">
            <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600">
              <s.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="tabular font-serif text-2xl font-semibold leading-none text-teal-700">{usersQ.isLoading ? '–' : s.v}</p>
              <p className="mt-1 truncate text-xs text-ink-soft">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky top-14 z-20 -mx-4 mb-4 flex flex-col gap-2 border-b border-line/60 bg-white/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:border-0 sm:bg-transparent sm:p-0">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-teal-500" />
          <Input id="users-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, username, phone, outlet…" className="pl-10" />
        </div>
        <div className="flex gap-1 rounded-xl bg-teal-50 p-1" role="tablist" aria-label="Filter by role">
          {(['all', 'shop_user', 'head_office', 'super_admin'] as const).map((r) => (
            <button
              key={r}
              id={`users-filter-${r}`}
              role="tab"
              aria-selected={roleFilter === r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-sm transition sm:flex-none',
                roleFilter === r ? 'bg-white font-medium text-teal-700 shadow-soft' : 'text-ink-soft hover:text-teal-700',
              )}
            >
              {r === 'all' ? 'All' : r === 'shop_user' ? 'Shops' : r === 'head_office' ? 'HO' : 'Admins'}
            </button>
          ))}
        </div>
      </div>

      {usersQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
          ))}
        </div>
      ) : usersQ.error ? (
        <EmptyState title="Couldn't load users" description={errorMessage(usersQ.error)} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title={q || roleFilter !== 'all' ? 'No matching users' : 'No users yet'}
          description={q || roleFilter !== 'all' ? 'Try a different search or filter.' : 'Create the first account for an outlet.'}
          action={<Button onClick={() => setEditing('new')}><Plus /> New user</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="hidden bg-teal-50/70 md:table-header-group">
              <tr className="[&>th]:label-caps [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                <th>User</th>
                <th>Role · Outlet</th>
                <th className="hidden lg:table-cell">Contact</th>
                <th>Status</th>
                <th className="hidden xl:table-cell">Last sign-in</th>
                <th className="w-12"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => {
                const locked = isLocked(u);
                return (
                  <tr key={u.id} className={cn('group transition-colors hover:bg-teal-50/40', !u.active && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-teal-800">
                            {u.full_name}
                            {u.id === me?.id && <span className="ml-1.5 text-xs font-normal text-ink-faint">(you)</span>}
                          </p>
                          <p className="truncate text-ink-soft">@{u.username}</p>
                          <p className="mt-1 flex flex-wrap gap-1 md:hidden">
                            <Badge tone="outline">{ROLE_LABEL[u.role]}</Badge>
                            {u.role === 'shop_user' && <Badge tone="teal">{outletName(u.outlet_id)}</Badge>}
                            <StatusBadges u={u} locked={locked} />
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <p className="text-teal-800">{ROLE_LABEL[u.role]}</p>
                      <p className="text-ink-soft">{outletName(u.outlet_id)}</p>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <p className="tabular text-teal-800">{u.phone}</p>
                      <p className="truncate text-ink-soft">{u.email}</p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        <StatusBadges u={u} locked={locked} />
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft xl:table-cell" title={formatDateTime(u.last_login_at)}>
                      {u.last_login_at ? timeAgo(u.last_login_at) : 'Never'}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <DM.Root>
                        <DM.Trigger asChild>
                          <Button id={`user-actions-${u.username}`} variant="ghost" size="icon-sm" aria-label={`Actions for ${u.full_name}`} loading={busyId === u.id}>
                            {busyId !== u.id && <MoreVertical />}
                          </Button>
                        </DM.Trigger>
                        <DM.Portal>
                          <DM.Content align="end" sideOffset={4} className="z-50 w-56 animate-rise rounded-2xl border border-line bg-white p-1.5 shadow-lift">
                            <MenuItem icon={Pencil} onSelect={() => setEditing(u)}>Edit details</MenuItem>
                            <MenuItem icon={KeyRound} onSelect={() => setConfirmReset(u)}>Reset passcode</MenuItem>
                            {locked && (
                              <MenuItem icon={LockOpen} onSelect={() => act(u, { unlock: true }, `${u.full_name} unlocked`)}>Unlock account</MenuItem>
                            )}
                            {u.id !== me?.id && (
                              <>
                                <DM.Separator className="my-1 h-px bg-line" />
                                {u.active ? (
                                  <MenuItem icon={UserX} danger onSelect={() => act(u, { active: false }, `${u.full_name} disabled`)}>Disable account</MenuItem>
                                ) : (
                                  <MenuItem icon={UserCheck} onSelect={() => act(u, { active: true }, `${u.full_name} enabled`)}>Enable account</MenuItem>
                                )}
                              </>
                            )}
                          </DM.Content>
                        </DM.Portal>
                      </DM.Root>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <UserFormDialog
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onCreated={(username, code) => setTemp({ username, code, reason: 'created' })}
          onSaved={refresh}
        />
      )}

      <Dialog
        open={!!confirmReset}
        onOpenChange={(o) => !o && setConfirmReset(null)}
        title="Reset passcode?"
        description={confirmReset ? `${confirmReset.full_name} will get a new temporary passcode and must change it at next sign-in. Any lock is cleared.` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(null)}>Cancel</Button>
            <Button id="confirm-reset" loading={busyId === confirmReset?.id} onClick={() => confirmReset && resetPasscode(confirmReset)}>
              <KeyRound /> Reset passcode
            </Button>
          </>
        }
      />

      <TempPasscodeDialog value={temp} onClose={() => setTemp(null)} />
    </>
  );
}

function StatusBadges({ u, locked }: { u: Profile; locked: boolean }) {
  return (
    <>
      {!u.active ? (
        <Badge tone="sold">Disabled</Badge>
      ) : locked ? (
        <Badge tone="error"><Lock /> Locked</Badge>
      ) : (
        <Badge tone="ok">Active</Badge>
      )}
      {u.must_change_password && u.active && <Badge tone="hold"><ShieldAlert /> Temp passcode</Badge>}
    </>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onSelect,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <DM.Item
      onSelect={onSelect}
      className={cn(
        'flex h-10 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm outline-none data-[highlighted]:bg-teal-50',
        danger ? 'text-error data-[highlighted]:bg-error-bg' : 'text-teal-800',
      )}
    >
      <Icon className={cn('size-4', danger ? 'text-error' : 'text-teal-600')} />
      {children}
    </DM.Item>
  );
}

/* ---------------------------------------------------------------- */

const userSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Full name is required'),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_.]{3,30}$/, '3–30 characters: lowercase letters, numbers, dot or underscore'),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone: z.string().trim().refine((v) => v.replace(/\D/g, '').length >= 10, 'Enter a valid contact number'),
    address: z.string().trim().max(300).optional(),
    role: z.enum(['shop_user', 'head_office', 'super_admin']),
    outlet_id: z.string().optional(),
  })
  .refine((v) => v.role !== 'shop_user' || !!v.outlet_id, { path: ['outlet_id'], message: 'Choose the outlet for this shop user' });
type UserValues = z.infer<typeof userSchema>;

function UserFormDialog({
  user,
  onClose,
  onCreated,
  onSaved,
}: {
  user: Profile | null;
  onClose: () => void;
  onCreated: (username: string, code: string) => void;
  onSaved: () => void;
}) {
  const outlets = (useOutlets().data ?? []).filter((o) => !o.is_head_office && (o.active || o.id === user?.outlet_id));
  const [busy, setBusy] = useState(false);
  const form = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: user
      ? {
          full_name: user.full_name,
          username: user.username,
          email: user.email,
          phone: user.phone,
          address: user.address ?? '',
          role: user.role,
          outlet_id: user.role === 'shop_user' ? user.outlet_id ?? '' : '',
        }
      : { role: 'shop_user', outlet_id: '', full_name: '', username: '', email: '', phone: '', address: '' },
  });
  const { errors } = form.formState;
  const role = useWatch({ control: form.control, name: 'role' });

  const submit = form.handleSubmit(async (v) => {
    setBusy(true);
    try {
      const body = { ...v, outlet_id: v.role === 'shop_user' ? v.outlet_id : null };
      if (user) {
        await callFunction('admin-update-user', { user_id: user.id, ...body });
        toast.success('User updated');
        onSaved();
        onClose();
      } else {
        const r = await callFunction<{ username: string; temp_passcode: string }>('admin-create-user', body);
        onSaved();
        onClose();
        onCreated(r.username, r.temp_passcode);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={user ? 'Edit user' : 'New user'}
      description={user ? `@${user.username}` : 'A temporary 6-digit passcode will be generated.'}
      id="user-form-dialog"
      className="sm:w-[min(40rem,calc(100vw-2rem))]"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button id="user-form-submit" onClick={submit} loading={busy}>
            {user ? <><Check /> Save</> : <><Plus /> Create user</>}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 pt-2 sm:grid-cols-2" noValidate>
        <Field label="Full name" error={errors.full_name?.message} required className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.full_name} autoComplete="off" {...form.register('full_name')} />}
        </Field>
        <Field label="Username" error={errors.username?.message} required hint="Used to sign in">
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              aria-invalid={!!errors.username}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              {...form.register('username', { setValueAs: (v: string) => v.toLowerCase().trim() })}
            />
          )}
        </Field>
        <Field label="Email" error={errors.email?.message} required>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.email} type="email" autoComplete="off" {...form.register('email')} />}
        </Field>
        <Field label="Contact number" error={errors.phone?.message} required>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.phone} type="tel" inputMode="tel" {...form.register('phone')} />}
        </Field>
        <Field label="Role" error={errors.role?.message} required>
          {(id, d) => (
            <NativeSelect id={id} aria-describedby={d} {...form.register('role')}>
              <option value="shop_user">Shop User</option>
              <option value="head_office">Head Office</option>
              <option value="super_admin">Super Admin</option>
            </NativeSelect>
          )}
        </Field>
        {role === 'shop_user' ? (
          <Field label="Outlet" error={errors.outlet_id?.message} required className="sm:col-span-2">
            {(id, d) => (
              <NativeSelect id={id} aria-describedby={d} aria-invalid={!!errors.outlet_id} {...form.register('outlet_id')}>
                <option value="">Choose outlet…</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        ) : (
          <p className="rounded-xl bg-teal-50 px-3 py-2.5 text-sm text-ink-soft sm:col-span-2">
            {role === 'head_office' ? 'Head Office' : 'Super Admin'} users are attached to the Head Office outlet automatically.
          </p>
        )}
        <Field label="Address" error={errors.address?.message} className="sm:col-span-2">
          {(id, d) => <Textarea id={id} aria-describedby={d} rows={2} {...form.register('address')} />}
        </Field>
      </form>
    </Dialog>
  );
}

function TempPasscodeDialog({
  value,
  onClose,
}: {
  value: { username: string; code: string; reason: 'created' | 'reset' } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(`Design Book\nUsername: ${value.username}\nTemporary passcode: ${value.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Dialog
      open={!!value}
      onOpenChange={(o) => {
        if (!o) {
          setCopied(false);
          onClose();
        }
      }}
      id="temp-passcode-dialog"
      title={value?.reason === 'reset' ? 'Passcode reset' : 'User created'}
      description="This temporary passcode is shown only once. Share it privately — the user must change it at first sign-in."
      footer={
        <>
          <Button variant="secondary" id="temp-copy" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy details'}
          </Button>
          <Button id="temp-done" onClick={onClose}>Done</Button>
        </>
      }
    >
      {value && (
        <div className="mt-2 rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50 to-white p-5 text-center">
          <p className="label-caps">Username</p>
          <p className="mt-1 text-lg font-medium text-teal-800">@{value.username}</p>
          <p className="label-caps mt-5">Temporary passcode</p>
          <div className="mt-2 flex justify-center gap-1.5" aria-label={`Passcode ${value.code.split('').join(' ')}`}>
            {value.code.split('').map((d, i) => (
              <span key={i} className="tabular grid h-14 w-11 place-items-center rounded-xl border border-teal-200 bg-white font-serif text-3xl font-semibold text-teal-700 shadow-soft">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}
