import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AtSign, Building2, KeyRound, Mail, MapPin, Phone, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Avatar, Badge, PageHeader } from '@/components/ui/misc';
import { callFunction } from '@/lib/api';
import { formatDateTime, ROLE_LABEL } from '@/lib/format';
import { errorMessage } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-context';
import { ChangePasscodeForm } from '@/features/auth/ChangePasscodePage';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length >= 10, 'Enter a valid contact number'),
  address: z.string().trim().max(300).optional(),
});
type Values = z.infer<typeof schema>;

export function ProfilePage() {
  const { profile, outlet, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: { email: profile?.email ?? '', phone: profile?.phone ?? '', address: profile?.address ?? '' },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    setSaving(true);
    try {
      await callFunction('update-profile', v);
      await refreshProfile();
      toast.success('Profile saved');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  });

  if (!profile) return null;

  return (
    <>
      <PageHeader eyebrow="Account" title="Your profile" description="Keep your contact details current and change your passcode any time." />

      <div className="grid gap-6 lg:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <div className="relative h-24 bg-gradient-to-r from-teal-50 via-teal-100 to-teal-50">
              <svg className="absolute right-6 top-3 h-20 text-teal-200" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
                <path d="M50 5 85 35 50 95 15 35Z M15 35h70 M32 35l18-30 18 30 M32 35l18 60 18-60" />
              </svg>
            </div>
            <div className="-mt-10 px-5 pb-5 sm:px-6">
              <Avatar name={profile.full_name} className="size-20 text-xl ring-4" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h2 className="text-3xl">{profile.full_name}</h2>
                <Badge tone="solid">{ROLE_LABEL[profile.role]}</Badge>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2 text-ink-soft">
                  <AtSign className="size-4 text-teal-500" />
                  <dt className="sr-only">Username</dt>
                  <dd>{profile.username}</dd>
                </div>
                <div className="flex items-center gap-2 text-ink-soft">
                  <Building2 className="size-4 text-teal-500" />
                  <dt className="sr-only">Outlet</dt>
                  <dd>{outlet?.name ?? '—'}</dd>
                </div>
                <div className="flex items-center gap-2 text-ink-soft sm:col-span-2">
                  <ShieldCheck className="size-4 text-teal-500" />
                  <dt className="sr-only">Last sign-in</dt>
                  <dd>Last sign-in {formatDateTime(profile.last_login_at)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-faint">Username, role and outlet can only be changed by a Super Admin.</p>
            </div>
          </section>

          <form onSubmit={onSubmit} className="card space-y-5 p-5 sm:p-6" noValidate>
            <h2 className="text-2xl">Contact details</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Email" error={errors.email?.message} required>
                {(id, d) => (
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-teal-500" />
                    <Input id={id} aria-describedby={d} aria-invalid={!!errors.email} type="email" className="pl-10" autoComplete="email" {...form.register('email')} />
                  </div>
                )}
              </Field>
              <Field label="Contact number" error={errors.phone?.message} required>
                {(id, d) => (
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-teal-500" />
                    <Input id={id} aria-describedby={d} aria-invalid={!!errors.phone} type="tel" inputMode="tel" className="pl-10" autoComplete="tel" {...form.register('phone')} />
                  </div>
                )}
              </Field>
            </div>
            <Field label="Address" error={errors.address?.message}>
              {(id, d) => (
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-teal-500" />
                  <Textarea id={id} aria-describedby={d} className="pl-10" rows={3} {...form.register('address')} />
                </div>
              )}
            </Field>
            <div className="flex justify-end">
              <Button id="profile-save" type="submit" loading={saving} disabled={!isDirty}>
                <Save /> Save changes
              </Button>
            </div>
          </form>
        </div>

        <section className="card h-fit p-5 sm:p-6" aria-labelledby="pc-title">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-100 text-teal-700">
              <KeyRound className="size-5" />
            </span>
            <div>
              <h2 id="pc-title" className="text-2xl leading-tight">
                Change passcode
              </h2>
              <p className="text-sm text-ink-soft">Your current passcode is required.</p>
            </div>
          </div>
          <ChangePasscodeForm idPrefix="profile-pc" />
        </section>
      </div>
    </>
  );
}
