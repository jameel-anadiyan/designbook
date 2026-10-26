import type { ReactNode } from 'react';
import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Centered dialog on a soft WHITE overlay (never a dark scrim). Bottom sheet style on phones. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  id,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="overlay-white fixed inset-0 z-50 data-[state=open]:animate-fade-in" />
        <D.Content
          id={id}
          className={cn(
            'fixed z-50 flex max-h-[92dvh] flex-col border border-line bg-white shadow-lift outline-none',
            'inset-x-0 bottom-0 rounded-t-3xl pb-safe data-[state=open]:animate-rise',
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-0',
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-teal-100 sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4 sm:px-6 sm:pt-5">
            <div className="min-w-0">
              <D.Title className="font-serif text-2xl font-semibold leading-tight text-teal-700">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-sm text-ink-soft">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</D.Description>
              )}
            </div>
            <D.Close
              className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-teal-50 hover:text-teal-700"
              aria-label="Close"
            >
              <X className="size-5" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-line bg-teal-50/50 px-5 py-3.5 sm:flex-row sm:justify-end sm:rounded-b-2xl sm:px-6">
              {footer}
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Side sheet (right) on tablet/desktop, bottom sheet on phones. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  side = 'right',
  id,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  side?: 'right' | 'bottom';
  id?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="overlay-white fixed inset-0 z-50 data-[state=open]:animate-fade-in" />
        <D.Content
          id={id}
          className={cn(
            'fixed z-50 flex flex-col border-line bg-white shadow-lift outline-none data-[state=open]:animate-rise',
            side === 'right'
              ? 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t pb-safe sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-96 sm:rounded-none sm:border-l sm:border-t-0'
              : 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t pb-safe',
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-teal-100 sm:hidden" aria-hidden />
          <div className="flex items-center justify-between px-5 py-4">
            <D.Title className="font-serif text-2xl font-semibold text-teal-700">{title}</D.Title>
            <D.Description className="sr-only">{typeof title === 'string' ? title : 'Panel'}</D.Description>
            <D.Close className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-teal-50" aria-label="Close">
              <X className="size-5" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
