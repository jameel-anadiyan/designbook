// Plain-JS copy of the generator in src/lib/passcode.ts for Node scripts.
export function passcodeProblem(code, phone) {
  if (!/^\d{6}$/.test(code)) return 'not 6 digits';
  if (/^(\d)\1{5}$/.test(code)) return 'repeated';
  const d = code.split('').map(Number);
  const s = d.slice(1).map((x, i) => x - d[i]);
  if (s.every((v) => v === 1) || s.every((v) => v === -1)) return 'sequence';
  if (/^(\d{2})\1\1$/.test(code) || /^(\d{3})\1$/.test(code)) return 'pattern';
  const p = (phone ?? '').replace(/\D/g, '');
  if (p.length >= 6 && p.slice(-6) === code) return 'phone';
  return null;
}
export function generatePasscode(phone) {
  for (;;) {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    const c = String(n).padStart(6, '0');
    if (!passcodeProblem(c, phone)) return c;
  }
}
