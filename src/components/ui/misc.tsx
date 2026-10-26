import type { HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

/* ---------------- Badge ---------------- */
const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 [&_svg]:size-3.5',
  {
    variants: {
      tone: {
        teal: 'bg-teal-100 text-teal-700',
        outline: 'border border-teal-200 bg-white text-teal-700',
        hold: 'bg-hold-bg text-hold',
        error: 'bg-error-bg text-error',
        sold: 'bg-sold-bg text-sold',
        ok: 'bg-ok-bg text-ok',
        solid: 'bg-teal-600 text-white',
      },
    },
    defaultVariants: { tone: 'teal' },
  },
);
export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/* ---------------- Skeleton ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

/* ---------------- Logo ---------------- */
export function Logo({ className, variant = 'full' }: { className?: string; variant?: 'full' | 'mark' }) {
  return (
    <img
      src={variant === 'full' ? '/brand/swa-logo.svg' : '/brand/swa-mark.svg'}
      alt="SWA Diamonds"
      className={cn('select-none', className)}
      draggable={false}
    />
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-100 to-teal-200 font-medium text-teal-700 ring-2 ring-white',
        className,
      )}
      aria-hidden
    >
      <span className="text-[0.8rem] tracking-wide">{initials(name)}</span>
    </span>
  );
}

/* ---------------- Page header ---------------- */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 animate-rise">
        {eyebrow && <p className="label-caps mb-1.5 text-teal-600">{eyebrow}</p>}
        <h1 className="text-[2rem] leading-[1.1] sm:text-[2.5rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/* ---------------- Empty state (teal line illustration) ---------------- */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex animate-rise flex-col items-center rounded-3xl border border-dashed border-teal-200 bg-gradient-to-b from-teal-50/80 to-white px-6 py-14 text-center">
      <div className="relative mb-5">
        <svg viewBox="0 0 120 120" className="size-28 text-teal-300" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
          <circle cx="60" cy="60" r="56" strokeDasharray="3 5" />
          <path d="M60 22 84 46 60 98 36 46Z" className="text-teal-500" stroke="currentColor" />
          <path d="M36 46h48M48 46l12-24 12 24M48 46l12 52 12-52" className="text-teal-400" stroke="currentColor" />
        </svg>
        {icon && (
          <span className="absolute -bottom-1 -right-1 grid size-10 place-items-center rounded-full bg-white text-teal-600 shadow-soft ring-1 ring-line">
            {icon}
          </span>
        )}
      </div>
      <h2 className="text-2xl">{title}</h2>
      {description && <p className="mt-2 max-w-md text-ink-soft">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ---------------- Stat card ---------------- */
export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('card group relative overflow-hidden p-4 transition hover:shadow-lift sm:p-5', className)}>
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-teal-50 transition group-hover:scale-110" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="label-caps">{label}</p>
        {icon && <span className="text-teal-500 [&_svg]:size-5">{icon}</span>}
      </div>
      <p className="tabular relative mt-2 font-serif text-4xl font-semibold text-teal-700">{value}</p>
      {hint && <p className="relative mt-1 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}
