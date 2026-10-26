// Passcode rules shared by the browser (src/lib/passcode.ts) and Edge Functions
// (supabase/functions/_shared/passcode.ts). KEEP BOTH FILES IDENTICAL.

export const PASSCODE_RE = /^\d{6}$/;

/** Returns a human message if the passcode is weak, otherwise null. */
export function passcodeProblem(code: string, phone?: string | null): string | null {
  if (!PASSCODE_RE.test(code)) return 'Passcode must be exactly 6 digits.';
  if (/^(\d)\1{5}$/.test(code)) return 'Passcode cannot be the same digit repeated.';
  const digits = code.split('').map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) {
    return 'Passcode cannot be a straight sequence like 123456.';
  }
  // repeating blocks: 121212, 123123
  if (/^(\d{2})\1\1$/.test(code) || /^(\d{3})\1$/.test(code)) {
    return 'Passcode cannot be a repeating pattern like 121212.';
  }
  const phoneDigits = (phone ?? '').replace(/\D/g, '');
  if (phoneDigits.length >= 6 && phoneDigits.slice(-6) === code) {
    return 'Passcode cannot be the last 6 digits of your phone number.';
  }
  return null;
}

/** Cryptographically random, non-weak 6-digit passcode. */
export function generatePasscode(phone?: string | null): string {
  for (;;) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const code = String(buf[0] % 1_000_000).padStart(6, '0');
    if (!passcodeProblem(code, phone)) return code;
  }
}
