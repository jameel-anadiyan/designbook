// INR + IST formatting helpers.

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹ 1,24,500 (Indian digit grouping). Pass decimals=true for ₹ 1,24,500.00 */
export function formatINR(value: number | string | null | undefined, decimals = false): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return `₹ ${(decimals ? inr2 : inr).format(n)}`;
}

const IST = 'Asia/Kolkata';
const dateFmt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
});
const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: true });

export const formatDate = (v?: string | Date | null) => (v ? dateFmt.format(new Date(v)) : '—');
export const formatDateTime = (v?: string | Date | null) => (v ? dateTimeFmt.format(new Date(v)) : '—');
export const formatTime = (v?: string | Date | null) => (v ? timeFmt.format(new Date(v)) : '—');

/** "just now", "5 min ago", "3 h ago", "2 d ago", else a date. */
export function timeAgo(v?: string | Date | null): string {
  if (!v) return '—';
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return formatDate(v);
}

export const ROLE_LABEL = {
  super_admin: 'Super Admin',
  head_office: 'Head Office',
  shop_user: 'Shop User',
} as const;

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
