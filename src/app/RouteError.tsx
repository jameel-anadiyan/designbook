import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/misc';

/** Error boundary for the router — light, branded, recoverable. */
export function RouteError() {
  const err = useRouteError();
  const msg = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : 'Unknown error';
  console.error(err);
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-white to-teal-50 px-6">
      <div className="card max-w-md p-8 text-center">
        <Logo className="mx-auto h-20 w-auto" />
        <h1 className="mt-6 text-3xl">Something went wrong</h1>
        <p className="mt-2 text-ink-soft">The page hit an unexpected problem. Your data is safe.</p>
        <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 font-mono text-xs text-ink-soft">{msg}</p>
        <Button className="mt-6 w-full" onClick={() => (window.location.href = '/')}>
          Reload Design Book
        </Button>
      </div>
    </div>
  );
}
