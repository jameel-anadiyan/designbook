import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Eye, EyeOff, Pencil, Plus, Shapes, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, PageHeader, Skeleton } from '@/components/ui/misc';
import { supabase, type Category } from '@/lib/supabase';
import { cn, errorMessage } from '@/lib/utils';
import { useCategories } from './queries';

export function CategoriesPage() {
  const { data, isLoading } = useCategories();
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['categories'] });
  const friendly = (e: unknown) => {
    const err = e as { code?: string };
    return err?.code === '23505' ? 'A category with that name already exists.' : errorMessage(e);
  };

  const add = async () => {
    const name = newName.trim();
    if (name.length < 2) return;
    setBusy(true);
    const { error } = await supabase.from('categories').insert({ name, sort_order: (data?.length ?? 0) + 1 });
    setBusy(false);
    if (error) return toast.error(friendly(error));
    setNewName('');
    toast.success(`“${name}” added`);
    refresh();
  };

  const rename = async (c: Category) => {
    const name = editName.trim();
    if (name.length < 2 || name === c.name) return setEditId(null);
    const { error } = await supabase.from('categories').update({ name }).eq('id', c.id);
    if (error) return toast.error(friendly(error));
    setEditId(null);
    refresh();
  };

  const toggle = async (c: Category) => {
    const { error } = await supabase.from('categories').update({ active: !c.active }).eq('id', c.id);
    if (error) return toast.error(friendly(error));
    toast.success(c.active ? `“${c.name}” hidden from uploads` : `“${c.name}” active again`);
    refresh();
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Categories" description="Used for uploads, filters and reports. Hide a category instead of deleting it so history stays intact." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="mb-5 flex max-w-xl gap-2"
      >
        <div className="relative flex-1">
          <Shapes className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-teal-500" />
          <Input id="category-new" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category, e.g. Nose pins" className="pl-10" />
        </div>
        <Button id="category-add" type="submit" loading={busy} disabled={newName.trim().length < 2}>
          <Plus /> Add
        </Button>
      </form>

      <ul className="max-w-xl divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="p-3"><Skeleton className="h-8" /></li>
            ))
          : data?.map((c) => (
              <li key={c.id} className={cn('flex min-h-14 items-center gap-3 px-4 py-2 transition hover:bg-teal-50/40', !c.active && 'bg-teal-50/30')}>
                {editId === c.id ? (
                  <form
                    className="flex flex-1 items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      rename(c);
                    }}
                  >
                    <Input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10" aria-label="Category name" />
                    <Button type="submit" size="icon-sm" aria-label="Save"><Check /></Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Cancel" onClick={() => setEditId(null)}><X /></Button>
                  </form>
                ) : (
                  <>
                    <span className={cn('flex-1 font-medium', c.active ? 'text-teal-800' : 'text-ink-faint line-through')}>{c.name}</span>
                    {!c.active && <Badge tone="sold">Hidden</Badge>}
                    <Button variant="ghost" size="icon-sm" aria-label={`Rename ${c.name}`} onClick={() => { setEditId(c.id); setEditName(c.name); }}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={c.active ? `Hide ${c.name}` : `Show ${c.name}`} onClick={() => toggle(c)}>
                      {c.active ? <EyeOff /> : <Eye />}
                    </Button>
                  </>
                )}
              </li>
            ))}
      </ul>
    </>
  );
}
