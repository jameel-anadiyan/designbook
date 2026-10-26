import { Link } from 'react-router';
import { Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/ui/misc';

export function ComingSoon({ title, description, phase }: { title: string; description: string; phase: number }) {
  return (
    <>
      <PageHeader eyebrow={`Arrives in phase ${phase}`} title={title} />
      <EmptyState
        icon={<Hammer className="size-5" />}
        title="Being crafted"
        description={description}
        action={
          <Button asChild variant="secondary">
            <Link to="/">Back to home</Link>
          </Button>
        }
      />
    </>
  );
}

export function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you're looking for doesn't exist or you don't have access."
      action={
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      }
    />
  );
}
