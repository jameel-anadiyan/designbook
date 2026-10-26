import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, Crown, MapPin, Pencil, Phone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Badge, PageHeader, Skeleton } from '@/components/ui/misc';
import { supabase, type Outlet } from '@/lib/supabase';
import { cn, errorMessage } from '@/lib/utils';
import { useOutlets } from './queries';

export function OutletsPage() {
  const { data, isLoading } = useOutlets();
  const [editing, setEditing] = useState<Outlet | 'new' | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Outlets"
        description="Shops and Head Office. Rename the placeholder outlets to your real store names."
        actions={<Button id="outlet-new" onClick={() => setEditing('new')}><Plus /> New outlet</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
          : data?.map((o) => (
              <article key={o.id} className={cn('card group relative p-5 transition hover:-translate-y-0.5 hover:shadow-lift', !o.active && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3">
                  <span className={cn('grid size-12 place-items-center rounded-2xl', o.is_head_office ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700')}>
                    {o.is_head_office ? <Crown className="size-5" /> : <Building2 className="size-5" />}
                  </span>
                  <Button id={`outlet-edit-${o.code}`} variant="ghost" size="icon-sm" aria-label={`Edit ${o.name}`} onClick={() => setEditing(o)}>
                    <Pencil />
                  </Button>
                </div>
                <h2 className="mt-3 text-2xl leading-tight">{o.name}</h2>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="outline" className="tabular">{o.code}</Badge>
                  {o.is_head_office && <Badge tone="solid">Head Office</Badge>}
                  {!o.active && <Badge tone="sold">Inactive</Badge>}
                </div>
                {(o.address || o.phone) && (
                  <div className="mt-3 space-y-1 text-sm text-ink-soft">
                    {o.address && <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-teal-500" />{o.address}</p>}
                    {o.phone && <p className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-teal-500" />{o.phone}</p>}
                  </div>
                )}
              </article>
            ))}
      </div>
      {editing && <OutletDialog outlet={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function OutletDialog({ outlet, onClose }: { outlet: Outlet | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(outlet?.name ?? '');
  const [code, setCode] = useState(outlet?.code ?? '');
  const [address, setAddress] = useState(outlet?.address ?? '');
  const [phone, setPhone] = useState(outlet?.phone ?? '');
  const [active, setActive] = useState(outlet?.active ?? true);
  const [busy, setBusy] = useState(false);
  const codeOk = /^[A-Z0-9_-]{2,12}$/.test(code);

  const save = async () => {
    if (name.trim().length < 2 || !codeOk) return;
    setBusy(true);
    try {
      const row = { name: name.trim(), code, address: address.trim() || null, phone: phone.trim() || null, active };
      const { error } = outlet
        ? await supabase.from('outlets').update(row).eq('id', outlet.id)
        : await supabase.from('outlets').insert(row);
      if (error) throw error.code === '23505' ? new Error('That outlet code is already used.') : error;
      toast.success(outlet ? 'Outlet updated' : 'Outlet created');
      qc.invalidateQueries({ queryKey: ['outlets'] });
      qc.invalidateQueries({ queryKey: ['outlet'] });
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={outlet ? 'Edit outlet' : 'New outlet'}
      id="outlet-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button id="outlet-save" onClick={save} loading={busy} disabled={name.trim().length < 2 || !codeOk}>Save</Button>
        </>
      }
    >
      <div className="grid gap-4 pt-2 sm:grid-cols-[1fr_9rem]">
        <Field label="Name" required error={name && name.trim().length < 2 ? 'Name is required' : undefined}>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Code" required error={code && !codeOk ? '2–12: A–Z, 0–9, - _' : undefined}>
          {(id) => <Input id={id} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))} className="tabular uppercase" />}
        </Field>
        <Field label="Phone" className="sm:col-span-2">
          {(id) => <Input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
        </Field>
        <Field label="Address" className="sm:col-span-2">
          {(id) => <Textarea id={id} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />}
        </Field>
        {!outlet?.is_head_office && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 sm:col-span-2">
            <input id="outlet-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-5 accent-teal-600" />
            <span>
              <span className="block font-medium text-teal-800">Active</span>
              <span className="text-sm text-ink-soft">Inactive outlets can't receive new users or uploads.</span>
            </span>
          </label>
        )}
      </div>
    </Dialog>
  );
}
