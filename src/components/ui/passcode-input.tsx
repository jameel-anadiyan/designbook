import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PasscodeInputHandle = { focus: () => void; clear: () => void };

type Props = {
  value: string;
  onChange: (v: string) => void;
  /** fired once when the 6th digit is entered (auto-submit) */
  onComplete?: (v: string) => void;
  idPrefix: string;
  label: string;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  /** shake animation trigger — change the number to replay */
  shakeKey?: number;
};

const LEN = 6;

/** Six single-digit boxes · numeric keypad · paste · auto-submit · show/hide. */
export const PasscodeInput = forwardRef<PasscodeInputHandle, Props>(function PasscodeInput(
  { value, onChange, onComplete, idPrefix, label, disabled, invalid, autoFocus, shakeKey = 0 },
  ref,
) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [show, setShow] = useState(false);
  const [shaking, setShaking] = useState(false);
  const digits = Array.from({ length: LEN }, (_, i) => value[i] ?? '');

  useImperativeHandle(ref, () => ({
    focus: () => inputs.current[Math.min(value.length, LEN - 1)]?.focus(),
    clear: () => {
      onChange('');
      requestAnimationFrame(() => inputs.current[0]?.focus());
    },
  }));

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!shakeKey) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 380);
    return () => clearTimeout(t);
  }, [shakeKey]);

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, LEN);
    onChange(clean);
    const focusAt = Math.min(clean.length, LEN - 1);
    requestAnimationFrame(() => inputs.current[focusAt]?.focus());
    if (clean.length === LEN && value.length !== LEN) onComplete?.(clean);
  };

  const handleInput = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '');
    if (!d) return;
    if (d.length > 1) {
      // autofill / fast typing: spread from this box
      commit(value.slice(0, i) + d);
      return;
    }
    const pos = Math.min(i, value.length);
    commit(value.slice(0, pos) + d + value.slice(pos + 1));
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) {
        commit(value.slice(0, i) + value.slice(i + 1));
        requestAnimationFrame(() => inputs.current[i]?.focus());
      } else if (i > 0) {
        commit(value.slice(0, i - 1) + value.slice(i));
        requestAnimationFrame(() => inputs.current[i - 1]?.focus());
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      inputs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < LEN - 1) {
      e.preventDefault();
      inputs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    commit(text);
  };

  return (
    <fieldset className="w-full" disabled={disabled}>
      <div className="mb-2 flex items-center justify-between">
        <legend className="label-caps">{label}</legend>
        <button
          type="button"
          id={`${idPrefix}-toggle`}
          onClick={() => setShow((s) => !s)}
          className="-mr-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-teal-600 hover:bg-teal-50"
          aria-pressed={show}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className={cn('flex justify-between gap-2 sm:gap-2.5', shaking && 'animate-shake')} role="group" aria-label={label}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            id={`${idPrefix}-${i + 1}`}
            type={show ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={LEN}
            value={d}
            aria-label={`${label} digit ${i + 1}`}
            aria-invalid={invalid || undefined}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={cn(
              'tabular aspect-[4/5] w-full min-w-0 max-w-14 rounded-xl border bg-white text-center font-serif text-[1.75rem] font-semibold text-teal-700 outline-none',
              'transition-[border-color,box-shadow,background-color,transform] duration-150',
              'focus:-translate-y-0.5 focus:border-teal-500 focus:shadow-glow',
              d ? 'border-teal-300 bg-teal-50/60' : 'border-line',
              invalid && 'border-error/50 bg-error-bg/40',
            )}
          />
        ))}
      </div>
    </fieldset>
  );
});
