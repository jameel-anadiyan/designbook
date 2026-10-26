import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowRight, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/misc';
import { PasscodeInput, type PasscodeInputHandle } from '@/components/ui/passcode-input';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/utils';
import { useAuth } from './auth-context';
import { FacetBackdrop } from './FacetBackdrop';

function useCountdown(until: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (!until) return 0;
  return Math.max(0, Math.ceil((new Date(until).getTime() - now) / 1000));
}

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [username, setUsername] = useState(() => localStorage.getItem('db:last-username') ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const passRef = useRef<PasscodeInputHandle>(null);
  const userRef = useRef<HTMLInputElement>(null);
  const secondsLeft = useCountdown(lockedUntil);
  const locked = secondsLeft > 0;

  useEffect(() => {
    if (username) passRef.current?.focus();
    else userRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usernameOk = /^[a-z0-9_.]{3,30}$/.test(username);

  const submit = async (passcode = code) => {
    if (busy || locked) return;
    if (!usernameOk) {
      setError('Enter your username.');
      userRef.current?.focus();
      return;
    }
    if (passcode.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const { mustChange } = await signIn(username, passcode);
      localStorage.setItem('db:last-username', username);
      navigate(mustChange ? '/change-passcode' : from, { replace: true });
    } catch (e) {
      setShake((n) => n + 1);
      passRef.current?.clear();
      if (e instanceof ApiError && e.status === 423 && typeof e.data.locked_until === 'string') {
        setLockedUntil(e.data.locked_until);
        setError(null);
      } else if (e instanceof ApiError && typeof e.data.attempts_left === 'number') {
        const left = e.data.attempts_left as number;
        setError(`${e.message} ${left} ${left === 1 ? 'try' : 'tries'} left before the account locks.`);
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-white px-5 py-10">
      <FacetBackdrop />

      <main className="relative z-10 w-full max-w-[25rem] animate-rise">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="h-36 w-auto sm:h-44" />
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px w-8 bg-teal-200" />
            <p className="label-caps text-teal-600">Design Book</p>
            <span className="h-px w-8 bg-teal-200" />
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-[1.75rem] border border-line/80 bg-white/85 p-6 shadow-lift backdrop-blur-xl sm:p-7"
          aria-labelledby="login-title"
          noValidate
        >
          <h1 id="login-title" className="text-center text-[1.9rem] leading-tight">
            Welcome back
          </h1>
          <p className="mb-6 mt-1 text-center text-sm text-ink-soft">Sign in with your username and 6-digit passcode.</p>

          <label htmlFor="login-username" className="label-caps mb-1.5 block">
            Username
          </label>
          <div className="relative mb-5">
            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-[1.1rem] -translate-y-1/2 text-teal-500" aria-hidden />
            <Input
              id="login-username"
              ref={userRef}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''));
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && usernameOk) {
                  e.preventDefault();
                  passRef.current?.focus();
                }
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              placeholder="your.username"
              className="h-12 pl-10"
              disabled={busy}
            />
          </div>

          <PasscodeInput
            ref={passRef}
            idPrefix="login-passcode"
            label="Passcode"
            value={code}
            onChange={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
            onComplete={(v) => submit(v)}
            disabled={busy || locked}
            invalid={!!error}
            shakeKey={shake}
          />

          <div className="min-h-[3.25rem] pt-3" aria-live="polite">
            {locked ? (
              <div className="flex items-start gap-2.5 rounded-xl bg-hold-bg px-3 py-2.5 text-sm text-hold">
                <Lock className="mt-0.5 size-4 shrink-0" />
                <span>
                  Too many wrong passcodes. Try again in <strong className="tabular">{mm}:{ss}</strong>, or ask your
                  administrator to unlock your account.
                </span>
              </div>
            ) : error ? (
              <p className="animate-fade-in rounded-xl bg-error-bg px-3 py-2.5 text-sm text-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <Button
            id="login-submit"
            type="submit"
            size="lg"
            className="mt-1 w-full"
            loading={busy}
            disabled={locked || code.length !== 6 || !usernameOk}
          >
            {busy ? 'Signing in…' : 'Sign in'}
            {!busy && <ArrowRight />}
          </Button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-ink-faint">
          <ShieldCheck className="size-3.5" /> Private catalogue · accounts are created by your administrator
        </p>
      </main>
    </div>
  );
}
