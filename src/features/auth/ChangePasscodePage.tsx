import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Check, KeyRound, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/misc';
import { PasscodeInput, type PasscodeInputHandle } from '@/components/ui/passcode-input';
import { callFunction } from '@/lib/api';
import { passcodeProblem } from '@/lib/passcode';
import { cn, errorMessage } from '@/lib/utils';
import { useAuth } from './auth-context';
import { FacetBackdrop } from './FacetBackdrop';

/** Shared form: current → new → confirm. Used by the forced first-login screen and Profile. */
export function ChangePasscodeForm({ onDone, idPrefix = 'cp' }: { onDone?: () => void; idPrefix?: string }) {
  const { profile, refreshProfile } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const nextRef = useRef<PasscodeInputHandle>(null);
  const confirmRef = useRef<PasscodeInputHandle>(null);

  const weak = next.length === 6 ? passcodeProblem(next, profile?.phone) : null;
  const sameAsCurrent = next.length === 6 && next === current;
  const mismatch = confirm.length === 6 && confirm !== next;
  const ready = current.length === 6 && next.length === 6 && !weak && !sameAsCurrent && confirm === next;

  const rules = [
    { ok: next.length === 6, label: 'Exactly 6 digits' },
    { ok: next.length === 6 && (!weak || weak.includes('phone')), label: 'Not a sequence, repeat or pattern (123456, 111111, 121212)' },
    { ok: next.length === 6 && !weak?.includes('phone'), label: 'Not the last 6 digits of your phone' },
    { ok: next.length === 6 && !sameAsCurrent, label: 'Different from your current passcode' },
  ];

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await callFunction('change-passcode', { current, next });
      await refreshProfile();
      toast.success('Passcode updated', { description: 'Use your new passcode next time you sign in.' });
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone?.();
    } catch (e) {
      setError(errorMessage(e));
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
      noValidate
    >
      <PasscodeInput
        idPrefix={`${idPrefix}-current`}
        label={profile?.must_change_password ? 'Temporary passcode' : 'Current passcode'}
        value={current}
        onChange={(v) => {
          setCurrent(v);
          setError(null);
        }}
        onComplete={() => nextRef.current?.focus()}
        autoFocus
        shakeKey={shake}
        invalid={!!error && error.toLowerCase().includes('current')}
      />
      <PasscodeInput
        ref={nextRef}
        idPrefix={`${idPrefix}-new`}
        label="New passcode"
        value={next}
        onChange={(v) => {
          setNext(v);
          setError(null);
        }}
        onComplete={(v) => {
          if (!passcodeProblem(v, profile?.phone)) confirmRef.current?.focus();
        }}
        invalid={!!weak || sameAsCurrent}
      />
      <ul className="grid gap-1.5 rounded-2xl bg-teal-50 p-3.5 text-sm" aria-label="Passcode rules">
        {rules.map((r) => (
          <li key={r.label} className={cn('flex items-start gap-2 transition-colors', r.ok ? 'text-teal-700' : 'text-ink-soft')}>
            <span
              className={cn(
                'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full transition-colors',
                r.ok ? 'bg-teal-600 text-white' : next.length === 6 ? 'bg-error-bg text-error' : 'bg-white ring-1 ring-line',
              )}
            >
              {r.ok ? <Check className="size-3" strokeWidth={3} /> : next.length === 6 ? <X className="size-3" strokeWidth={3} /> : null}
            </span>
            {r.label}
          </li>
        ))}
      </ul>
      <PasscodeInput
        ref={confirmRef}
        idPrefix={`${idPrefix}-confirm`}
        label="Confirm new passcode"
        value={confirm}
        onChange={(v) => {
          setConfirm(v);
          setError(null);
        }}
        invalid={mismatch}
      />
      <div className="min-h-6" aria-live="polite">
        {mismatch && <p className="text-sm text-error">The two new passcodes don't match.</p>}
        {weak && <p className="text-sm text-error">{weak}</p>}
        {error && (
          <p className="rounded-xl bg-error-bg px-3 py-2.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button id={`${idPrefix}-submit`} type="submit" size="lg" className="w-full" disabled={!ready} loading={busy}>
        <KeyRound /> Save new passcode
      </Button>
    </form>
  );
}

export function ChangePasscodePage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-white px-5 py-10">
      <FacetBackdrop />
      <main className="relative z-10 w-full max-w-[25rem] animate-rise">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-28 w-auto" />
        </div>
        <div className="rounded-[1.75rem] border border-line/80 bg-white/90 p-6 shadow-lift backdrop-blur-xl sm:p-7">
          <p className="label-caps text-center text-teal-600">
            {profile?.must_change_password ? 'First sign-in' : 'Security'}
          </p>
          <h1 className="mt-1 text-center text-[1.9rem] leading-tight">Set your passcode</h1>
          <p className="mb-6 mt-1 text-center text-sm text-ink-soft">
            Hi {profile?.full_name?.split(' ')[0]}, replace your temporary passcode with a private one only you know.
          </p>
          <ChangePasscodeForm idPrefix="first" onDone={() => navigate('/', { replace: true })} />
        </div>
        <button
          id="first-signout"
          onClick={signOut}
          className="mx-auto mt-5 flex items-center gap-1.5 text-sm text-ink-soft hover:text-teal-700"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </main>
    </div>
  );
}
