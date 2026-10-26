-- =====================================================================
-- Design Book · 0003_rpc.sql
-- Every state change: security definer, role + status checks,
-- row updates, design_events row, notifications.
-- =====================================================================

-- ---------------------------------------------------------------------
-- INTERNAL HELPERS (not callable by clients; revoked at the bottom)
-- ---------------------------------------------------------------------
create or replace function public._fail(p_msg text) returns void
language plpgsql as $$ begin raise exception using errcode = 'P0001', message = p_msg; end $$;

create or replace function public._require_role(p_roles public.app_role[]) returns public.app_role
language plpgsql stable security definer set search_path = '' as $$
declare v public.app_role := public.auth_role();
begin
  if v is null then perform public._fail('Not signed in or account disabled.'); end if;
  if not (v = any (p_roles)) then perform public._fail('You do not have permission to do this.'); end if;
  return v;
end $$;

create or replace function public._log(p_design uuid, p_transfer uuid, p_event text,
  p_outlet uuid, p_data jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.design_events (design_id, transfer_id, event, outlet_id, actor_id, data)
  values (p_design, p_transfer, p_event, p_outlet, auth.uid(), coalesce(p_data, '{}'));
$$;

create or replace function public._notify_outlet(p_outlet uuid, p_kind text, p_title text,
  p_body text, p_design uuid, p_transfer uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, design_id, transfer_id)
  select p.id, p_kind, p_title, p_body, p_design, p_transfer
  from public.profiles p
  where p.outlet_id = p_outlet and p.active and p.id is distinct from auth.uid();
$$;

create or replace function public._notify_staff(p_kind text, p_title text,
  p_body text, p_design uuid, p_transfer uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, design_id, transfer_id)
  select p.id, p_kind, p_title, p_body, p_design, p_transfer
  from public.profiles p
  where p.role in ('head_office','super_admin') and p.active and p.id is distinct from auth.uid();
$$;

create or replace function public._notify_user(p_user uuid, p_kind text, p_title text,
  p_body text, p_design uuid, p_transfer uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, design_id, transfer_id)
  select p.id, p_kind, p_title, p_body, p_design, p_transfer
  from public.profiles p where p.id = p_user and p.active and p.id is distinct from auth.uid();
$$;

-- Lock a live (non-deleted) design row for update.
create or replace function public._lock_design(p_id uuid) returns public.designs
language plpgsql security definer set search_path = '' as $$
declare d public.designs;
begin
  select * into d from public.designs where id = p_id for update;
  if not found or d.deleted_at is not null then perform public._fail('Design not found.'); end if;
  return d;
end $$;

-- Owner outlet user or staff.
create or replace function public._can_manage(d public.designs) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_staff()
      or (public.auth_role() = 'shop_user' and d.current_outlet_id = public.auth_outlet());
$$;

create or replace function public._object_exists(p_bucket text, p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from storage.objects o where o.bucket_id = p_bucket and o.name = p_path);
$$;

-- Move a design: close current location stay, open a new one.
create or replace function public._move_location(p_design uuid, p_outlet uuid) returns void
language sql security definer set search_path = '' as $$
  update public.design_locations set left_at = now() where design_id = p_design and left_at is null;
  insert into public.design_locations (design_id, outlet_id, arrived_at) values (p_design, p_outlet, now());
$$;

-- Release the active hold of a design (if any).
create or replace function public._release_active_hold(p_design uuid, p_note text) returns void
language sql security definer set search_path = '' as $$
  update public.holds set released_at = now(), released_by = auth.uid(), release_note = p_note
  where design_id = p_design and released_at is null;
$$;

create or replace function public._sku(p_design uuid) returns text
language sql stable security definer set search_path = '' as $$
  select sku from public.designs where id = p_design;
$$;

-- ---------------------------------------------------------------------
-- UNIQUENESS CHECKS (debounced from the upload wizard)
-- ---------------------------------------------------------------------
create or replace function public.sku_exists(p_sku text, p_exclude uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.auth_role() is not null and exists (
    select 1 from public.designs where sku = upper(trim(p_sku))
      and (p_exclude is null or id <> p_exclude));
$$;

create or replace function public.barcode_exists(p_barcode text, p_exclude uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.auth_role() is not null and exists (
    select 1 from public.designs where barcode = trim(p_barcode)
      and (p_exclude is null or id <> p_exclude));
$$;

-- ---------------------------------------------------------------------
-- CREATE DESIGN
-- p: { id, sku, barcode, category_id, mrp, title?, notes?, outlet_id? (staff),
--      media: [{kind, path, mime?, bytes?, width?, height?, duration_s?}] }
-- ---------------------------------------------------------------------
create or replace function public.create_design(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role := public._require_role(array['shop_user','head_office','super_admin']::public.app_role[]);
  v_id uuid := coalesce((p->>'id')::uuid, gen_random_uuid());
  v_outlet uuid;
  v_sku text := upper(trim(coalesce(p->>'sku','')));
  v_barcode text := trim(coalesce(p->>'barcode',''));
  v_mrp numeric := (p->>'mrp')::numeric;
  v_cat uuid := (p->>'category_id')::uuid;
  v_kind public.media_kind;
  v_m jsonb;
  v_count int;
begin
  if v_role = 'shop_user' then
    v_outlet := public.auth_outlet();
  else
    v_outlet := coalesce((p->>'outlet_id')::uuid, public.auth_outlet(), public.head_office_id());
  end if;
  if not exists (select 1 from public.outlets where id = v_outlet and active) then
    perform public._fail('Outlet is not valid.');
  end if;
  if v_sku = '' then perform public._fail('SKU is required.'); end if;
  if v_barcode = '' then perform public._fail('Barcode is required.'); end if;
  if v_mrp is null or v_mrp <= 0 then perform public._fail('MRP must be greater than zero.'); end if;
  if not exists (select 1 from public.categories where id = v_cat and active) then
    perform public._fail('Choose a valid category.');
  end if;
  if exists (select 1 from public.designs where sku = v_sku) then perform public._fail('SKU already exists.'); end if;
  if exists (select 1 from public.designs where barcode = v_barcode) then perform public._fail('Barcode already exists.'); end if;
  if exists (select 1 from public.designs where id = v_id) then perform public._fail('Design id already used.'); end if;

  -- all 8 media kinds, exactly once each, stored under {id}/{kind}/
  foreach v_kind in array enum_range(null::public.media_kind) loop
    select count(*) into v_count from jsonb_array_elements(coalesce(p->'media','[]'::jsonb)) e
      where e->>'kind' = v_kind::text;
    if v_count <> 1 then perform public._fail(format('Media "%s" is missing.', replace(v_kind::text,'_',' '))); end if;
  end loop;
  for v_m in select * from jsonb_array_elements(p->'media') loop
    if (v_m->>'path') not like v_id::text || '/' || (v_m->>'kind') || '/%' then
      perform public._fail('Media path does not match the design.');
    end if;
    if not public._object_exists('design-media', v_m->>'path') then
      perform public._fail(format('Media "%s" was not uploaded.', v_m->>'kind'));
    end if;
  end loop;

  insert into public.designs (id, sku, barcode, category_id, mrp, title, notes,
    origin_outlet_id, current_outlet_id, location_since, created_by)
  values (v_id, v_sku, v_barcode, v_cat, round(v_mrp, 2), nullif(trim(p->>'title'),''),
    nullif(trim(p->>'notes'),''), v_outlet, v_outlet, now(), auth.uid());

  insert into public.design_media (design_id, kind, storage_path, mime, bytes, width, height, duration_s, uploaded_by)
  select v_id, (e->>'kind')::public.media_kind, e->>'path', e->>'mime', (e->>'bytes')::int,
         (e->>'width')::int, (e->>'height')::int, (e->>'duration_s')::numeric, auth.uid()
  from jsonb_array_elements(p->'media') e;

  insert into public.design_locations (design_id, outlet_id, arrived_at) values (v_id, v_outlet, now());
  perform public._log(v_id, null, 'created', v_outlet,
    jsonb_build_object('sku', v_sku, 'barcode', v_barcode, 'mrp', v_mrp, 'category_id', v_cat));
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- UPDATE DESIGN (owner shop: available/on_hold · staff: not in transfer)
-- p: { sku?, barcode?, category_id?, mrp?, title?, notes? }
-- ---------------------------------------------------------------------
create or replace function public.update_design(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.designs := public._lock_design(p_id); v_new public.designs; v_diff jsonb := '{}';
begin
  if not public._can_manage(d) then perform public._fail('Only the owner outlet or Head Office can edit this design.'); end if;
  if d.status in ('requested','in_transfer') then perform public._fail('Cannot edit while the design is requested or in transfer.'); end if;
  if d.status = 'sold' and not public.is_staff() then perform public._fail('Cannot edit a sold design. Unmark sold first.'); end if;

  v_new := d;
  if p ? 'sku' then v_new.sku := upper(trim(p->>'sku')); end if;
  if p ? 'barcode' then v_new.barcode := trim(p->>'barcode'); end if;
  if p ? 'category_id' then v_new.category_id := (p->>'category_id')::uuid; end if;
  if p ? 'mrp' then v_new.mrp := round((p->>'mrp')::numeric, 2); end if;
  if p ? 'title' then v_new.title := nullif(trim(p->>'title'),''); end if;
  if p ? 'notes' then v_new.notes := nullif(trim(p->>'notes'),''); end if;

  if v_new.sku = '' or v_new.barcode = '' then perform public._fail('SKU and barcode are required.'); end if;
  if v_new.mrp is null or v_new.mrp <= 0 then perform public._fail('MRP must be greater than zero.'); end if;
  if v_new.sku <> d.sku and exists (select 1 from public.designs where sku = v_new.sku) then perform public._fail('SKU already exists.'); end if;
  if v_new.barcode <> d.barcode and exists (select 1 from public.designs where barcode = v_new.barcode) then perform public._fail('Barcode already exists.'); end if;
  if v_new.category_id <> d.category_id and not exists (select 1 from public.categories where id = v_new.category_id and active) then
    perform public._fail('Choose a valid category.');
  end if;

  if v_new.sku is distinct from d.sku then v_diff := v_diff || jsonb_build_object('sku', jsonb_build_array(d.sku, v_new.sku)); end if;
  if v_new.barcode is distinct from d.barcode then v_diff := v_diff || jsonb_build_object('barcode', jsonb_build_array(d.barcode, v_new.barcode)); end if;
  if v_new.category_id is distinct from d.category_id then v_diff := v_diff || jsonb_build_object('category_id', jsonb_build_array(d.category_id, v_new.category_id)); end if;
  if v_new.mrp is distinct from d.mrp then v_diff := v_diff || jsonb_build_object('mrp', jsonb_build_array(d.mrp, v_new.mrp)); end if;
  if v_new.title is distinct from d.title then v_diff := v_diff || jsonb_build_object('title', jsonb_build_array(d.title, v_new.title)); end if;
  if v_new.notes is distinct from d.notes then v_diff := v_diff || jsonb_build_object('notes', jsonb_build_array(d.notes, v_new.notes)); end if;
  if v_diff = '{}' then return; end if;

  update public.designs set sku = v_new.sku, barcode = v_new.barcode, category_id = v_new.category_id,
    mrp = v_new.mrp, title = v_new.title, notes = v_new.notes
  where id = p_id;
  perform public._log(p_id, null, 'edited', d.current_outlet_id, v_diff);
end $$;

-- ---------------------------------------------------------------------
-- REPLACE ONE MEDIA SLOT (old version kept, is_current = false).
-- Replacing any image auto-resolves open "image not clear" votes.
-- ---------------------------------------------------------------------
create or replace function public.replace_media(p_id uuid, p_kind public.media_kind, p_path text,
  p_mime text default null, p_bytes int default null, p_width int default null,
  p_height int default null, p_duration numeric default null) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.designs := public._lock_design(p_id);
begin
  if not public._can_manage(d) then perform public._fail('Only the owner outlet or Head Office can replace media.'); end if;
  if d.status in ('requested','in_transfer') and not public.is_staff() then
    perform public._fail('Cannot replace media while the design is requested or in transfer.');
  end if;
  if p_path not like p_id::text || '/' || p_kind::text || '/%' then perform public._fail('Media path does not match the design.'); end if;
  if not public._object_exists('design-media', p_path) then perform public._fail('File was not uploaded.'); end if;

  update public.design_media set is_current = false where design_id = p_id and kind = p_kind and is_current;
  insert into public.design_media (design_id, kind, storage_path, mime, bytes, width, height, duration_s, uploaded_by)
  values (p_id, p_kind, p_path, p_mime, p_bytes, p_width, p_height, p_duration, auth.uid());
  perform public._log(p_id, null, 'media_replaced', d.current_outlet_id, jsonb_build_object('kind', p_kind));

  if d.unclear_votes > 0 then
    perform public.resolve_image_votes(p_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- SOLD / UNSOLD
-- ---------------------------------------------------------------------
create or replace function public.mark_sold(p_id uuid, p_invoice_no text, p_invoice_path text,
  p_amount numeric default null) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.designs := public._lock_design(p_id);
begin
  if not public._can_manage(d) then perform public._fail('Only the owner outlet or Head Office can mark this sold.'); end if;
  if d.status not in ('available','on_hold') then perform public._fail('Only available or on-hold designs can be marked sold.'); end if;
  if coalesce(trim(p_invoice_no),'') = '' then perform public._fail('Invoice number is required.'); end if;
  if coalesce(p_invoice_path,'') = '' or p_invoice_path not like 'invoices/' || p_id::text || '/%'
     or not public._object_exists('documents', p_invoice_path) then
    perform public._fail('Invoice file is required.');
  end if;
  if p_amount is not null and p_amount < 0 then perform public._fail('Sale amount cannot be negative.'); end if;

  if d.status = 'on_hold' then perform public._release_active_hold(p_id, 'Released: marked sold'); end if;
  update public.designs set status = 'sold', sold_at = now(), sold_by = auth.uid(),
    sold_invoice_no = trim(p_invoice_no), sold_invoice_path = p_invoice_path, sold_amount = p_amount
  where id = p_id;
  perform public._log(p_id, null, 'sold', d.current_outlet_id,
    jsonb_build_object('invoice_no', trim(p_invoice_no), 'invoice_path', p_invoice_path,
                       'amount', p_amount, 'mrp', d.mrp,
                       'age_days', floor(extract(epoch from now() - d.location_since)/86400)::int,
                       'from_status', d.status));
end $$;

create or replace function public.unmark_sold(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.designs := public._lock_design(p_id);
begin
  if not public._can_manage(d) then perform public._fail('Only the owner outlet or Head Office can reverse this sale.'); end if;
  if d.status <> 'sold' then perform public._fail('Design is not sold.'); end if;
  update public.designs set status = 'available', sold_at = null, sold_by = null,
    sold_invoice_no = null, sold_invoice_path = null, sold_amount = null
  where id = p_id;
  perform public._log(p_id, null, 'unsold', d.current_outlet_id,
    jsonb_build_object('invoice_no', d.sold_invoice_no, 'invoice_path', d.sold_invoice_path,
                       'amount', d.sold_amount, 'sold_at', d.sold_at));
end $$;

-- ---------------------------------------------------------------------
-- HOLDS
-- ---------------------------------------------------------------------
create or replace function public._insert_hold(d public.designs, p_days int, p_reason text,
  p_doc text, p_source text, p_transfer uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_no int;
begin
  if p_days is null or p_days not between 1 and 30 then perform public._fail('Hold days must be between 1 and 30.'); end if;
  if length(trim(coalesce(p_reason,''))) < 5 then perform public._fail('Reason must be at least 5 characters.'); end if;
  if coalesce(p_doc,'') = '' or not public._object_exists('documents', p_doc) then perform public._fail('A supporting document is required.'); end if;

  select coalesce(max(hold_no), 0) + 1 into v_no from public.holds
    where design_id = d.id and outlet_id = d.current_outlet_id;
  insert into public.holds (design_id, outlet_id, reason, doc_path, days, expires_at, hold_no, source, transfer_id, held_by)
  values (d.id, d.current_outlet_id, trim(p_reason), p_doc, p_days, now() + make_interval(days => p_days),
          v_no, p_source, p_transfer, auth.uid());
  update public.designs set status = 'on_hold' where id = d.id;
  perform public._log(d.id, p_transfer, 'hold', d.current_outlet_id,
    jsonb_build_object('hold_no', v_no, 'days', p_days, 'reason', trim(p_reason), 'doc_path', p_doc, 'source', p_source));
  return v_no;
end $$;

create or replace function public.place_hold(p_id uuid, p_days int, p_reason text, p_doc_path text) returns int
language plpgsql security definer set search_path = '' as $$
declare d public.designs := public._lock_design(p_id);
begin
  if not public._can_manage(d) then perform public._fail('Only the owner outlet or Head Office can hold this design.'); end if;
  if d.status <> 'available' then perform public._fail('Only available designs can be put on hold.'); end if;
  if p_doc_path not like 'holds/' || p_id::text || '/%' then perform public._fail('Hold document path is not valid.'); end if;
  return public._insert_hold(d, p_days, p_reason, p_doc_path, 'manual', null);
end $$;

create or replace function public.release_hold(p_id uuid, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.designs := public._lock_design(p_id); v_no int;
begin
  if not public._can_manage(d) then perform public._fail('Only the owner outlet or Head Office can release this hold.'); end if;
  if d.status <> 'on_hold' then perform public._fail('Design is not on hold.'); end if;
  select hold_no into v_no from public.holds where design_id = p_id and released_at is null;
  perform public._release_active_hold(p_id, coalesce(nullif(trim(p_note),''), 'Released manually'));
  update public.designs set status = 'available' where id = p_id;
  perform public._log(p_id, null, 'hold_released', d.current_outlet_id,
    jsonb_build_object('hold_no', v_no, 'note', p_note, 'auto', false));
end $$;

-- Hourly (pg_cron): release expired holds, warn 1 day before expiry.
create or replace function public.release_expired_holds() returns int
language plpgsql security definer set search_path = '' as $$
declare h record; v_n int := 0;
begin
  for h in select * from public.holds where released_at is null and expires_at <= now() for update loop
    update public.holds set released_at = now(), release_note = 'Expired' where id = h.id;
    update public.designs set status = 'available' where id = h.design_id and status = 'on_hold';
    insert into public.design_events (design_id, event, outlet_id, data)
      values (h.design_id, 'hold_released', h.outlet_id, jsonb_build_object('hold_no', h.hold_no, 'auto', true));
    perform public._notify_outlet(h.outlet_id, 'hold_expired', 'Hold expired',
      format('%s · Hold #%s has expired and the design is available again.', public._sku(h.design_id), h.hold_no),
      h.design_id, null);
    v_n := v_n + 1;
  end loop;

  for h in select * from public.holds where released_at is null and not expiry_notified
             and expires_at <= now() + interval '1 day' for update loop
    update public.holds set expiry_notified = true where id = h.id;
    perform public._notify_outlet(h.outlet_id, 'hold_expiring', 'Hold expiring soon',
      format('%s · Hold #%s expires within 24 hours.', public._sku(h.design_id), h.hold_no), h.design_id, null);
  end loop;
  return v_n;
end $$;

-- ---------------------------------------------------------------------
-- TRANSFERS
-- ---------------------------------------------------------------------
create or replace function public._lock_transfer(p_id uuid) returns public.transfers
language plpgsql security definer set search_path = '' as $$
declare t public.transfers;
begin
  select * into t from public.transfers where id = p_id for update;
  if not found then perform public._fail('Transfer not found.'); end if;
  return t;
end $$;

create or replace function public.request_transfer(p_id uuid, p_note text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role := public._require_role(array['shop_user']::public.app_role[]);
  v_my uuid := public.auth_outlet();
  d public.designs := public._lock_design(p_id);
  v_t uuid;
begin
  if d.current_outlet_id = v_my then perform public._fail('This design is already at your outlet.'); end if;
  if d.status <> 'available' then
    perform public._fail(format('This design cannot be requested (status: %s).', replace(d.status::text,'_',' ')));
  end if;
  insert into public.transfers (design_id, from_outlet_id, to_outlet_id, request_note, requested_by)
  values (p_id, d.current_outlet_id, v_my, nullif(trim(p_note),''), auth.uid())
  returning id into v_t;
  update public.designs set status = 'requested' where id = p_id;
  perform public._log(p_id, v_t, 'requested', v_my, jsonb_build_object('from', d.current_outlet_id, 'to', v_my, 'note', p_note));
  perform public._notify_outlet(d.current_outlet_id, 'request_received', 'New transfer request',
    format('%s was requested by another outlet.', d.sku), p_id, v_t);
  return v_t;
end $$;

create or replace function public.cancel_request(p_transfer uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.transfers := public._lock_transfer(p_transfer); d public.designs;
begin
  perform public._require_role(array['shop_user','head_office','super_admin']::public.app_role[]);
  if not (public.is_staff() or t.to_outlet_id = public.auth_outlet()) then perform public._fail('Only the requesting outlet can cancel.'); end if;
  if t.status <> 'requested' then perform public._fail('Only a pending request can be cancelled.'); end if;
  d := public._lock_design(t.design_id);
  update public.transfers set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now() where id = p_transfer;
  update public.designs set status = 'available' where id = t.design_id and status = 'requested';
  perform public._log(t.design_id, p_transfer, 'request_cancelled', t.to_outlet_id, '{}');
  perform public._notify_outlet(t.from_outlet_id, 'request_cancelled', 'Request cancelled',
    format('The request for %s was cancelled.', d.sku), t.design_id, p_transfer);
end $$;

create or replace function public.decide_transfer(p_transfer uuid, p_accept boolean,
  p_reason text default null, p_doc_path text default null, p_hold_days int default null) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.transfers := public._lock_transfer(p_transfer); d public.designs;
begin
  perform public._require_role(array['shop_user','head_office','super_admin']::public.app_role[]);
  if not (public.is_staff() or t.from_outlet_id = public.auth_outlet()) then perform public._fail('Only the owner outlet can decide this request.'); end if;
  if t.status <> 'requested' then perform public._fail('This request has already been decided.'); end if;
  d := public._lock_design(t.design_id);
  if d.status <> 'requested' then perform public._fail('Design is not in requested state.'); end if;

  if p_accept then
    update public.transfers set status = 'accepted', decided_by = auth.uid(), decided_at = now(),
      prev_location_since = d.location_since where id = p_transfer;
    update public.designs set status = 'in_transfer' where id = d.id;
    perform public._log(d.id, p_transfer, 'accepted', t.from_outlet_id, '{}');
    perform public._notify_outlet(t.to_outlet_id, 'request_accepted', 'Request accepted',
      format('%s was accepted and will be sent via Head Office.', d.sku), d.id, p_transfer);
  else
    if length(trim(coalesce(p_reason,''))) < 5 then perform public._fail('A rejection reason (min 5 characters) is required.'); end if;
    if coalesce(p_doc_path,'') = '' or p_doc_path not like 'rejections/' || p_transfer::text || '/%'
       or not public._object_exists('documents', p_doc_path) then
      perform public._fail('A rejection document is required.');
    end if;
    if p_hold_days is null or p_hold_days not between 1 and 30 then perform public._fail('Hold days must be between 1 and 30.'); end if;
    update public.transfers set status = 'rejected', decided_by = auth.uid(), decided_at = now(),
      reject_reason = trim(p_reason), reject_doc_path = p_doc_path, reject_hold_days = p_hold_days
    where id = p_transfer;
    perform public._log(d.id, p_transfer, 'rejected', t.from_outlet_id,
      jsonb_build_object('reason', trim(p_reason), 'doc_path', p_doc_path, 'hold_days', p_hold_days, 'requester', t.to_outlet_id));
    perform public._insert_hold(d, p_hold_days, p_reason, p_doc_path, 'rejection', p_transfer);
    perform public._notify_outlet(t.to_outlet_id, 'request_rejected', 'Request rejected',
      format('%s: %s', d.sku, trim(p_reason)), d.id, p_transfer);
  end if;
end $$;

create or replace function public.send_to_ho(p_transfer uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.transfers := public._lock_transfer(p_transfer);
begin
  perform public._require_role(array['shop_user','head_office','super_admin']::public.app_role[]);
  if not (public.is_staff() or t.from_outlet_id = public.auth_outlet()) then perform public._fail('Only the owner outlet can send this to Head Office.'); end if;
  if t.status <> 'accepted' then perform public._fail('Only accepted transfers can be sent to Head Office.'); end if;
  update public.transfers set status = 'sent_to_ho', sent_to_ho_by = auth.uid(), sent_to_ho_at = now() where id = p_transfer;
  perform public._log(t.design_id, p_transfer, 'sent_to_ho', t.from_outlet_id, '{}');
  perform public._notify_staff('sent_to_ho', 'Design on its way to HO',
    format('%s was sent to Head Office.', public._sku(t.design_id)), t.design_id, p_transfer);
  perform public._notify_outlet(t.to_outlet_id, 'sent_to_ho', 'Sent to Head Office',
    format('%s is on its way to Head Office.', public._sku(t.design_id)), t.design_id, p_transfer);
end $$;

create or replace function public.ho_receive(p_transfer uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.transfers := public._lock_transfer(p_transfer); v_ho uuid := public.head_office_id();
begin
  perform public._require_role(array['head_office','super_admin']::public.app_role[]);
  if t.status <> 'sent_to_ho' then perform public._fail('Only transfers sent to Head Office can be received there.'); end if;
  if v_ho is null then perform public._fail('No Head Office outlet is configured.'); end if;
  perform public._lock_design(t.design_id);
  update public.transfers set status = 'received_at_ho', ho_received_by = auth.uid(), ho_received_at = now() where id = p_transfer;
  update public.designs set current_outlet_id = v_ho where id = t.design_id;   -- location_since untouched
  perform public._move_location(t.design_id, v_ho);
  perform public._log(t.design_id, p_transfer, 'ho_received', v_ho, '{}');
end $$;

create or replace function public.ho_dispatch(p_transfer uuid, p_target text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.transfers := public._lock_transfer(p_transfer); v_status public.transfer_status; v_dest uuid;
begin
  perform public._require_role(array['head_office','super_admin']::public.app_role[]);
  if t.status <> 'received_at_ho' then perform public._fail('Only transfers received at Head Office can be dispatched.'); end if;
  if p_target = 'requester' then v_status := 'dispatched_to_requester'; v_dest := t.to_outlet_id;
  elsif p_target = 'origin' then v_status := 'dispatched_to_origin'; v_dest := t.from_outlet_id;
  else perform public._fail('Target must be requester or origin.'); end if;
  update public.transfers set status = v_status, ho_dispatched_by = auth.uid(), ho_dispatched_at = now(),
    ho_note = nullif(trim(p_note),'') where id = p_transfer;
  perform public._log(t.design_id, p_transfer,
    case when p_target = 'requester' then 'forwarded' else 'returned_to_origin' end,
    public.head_office_id(), jsonb_build_object('to', v_dest, 'note', p_note));
  perform public._notify_outlet(v_dest, 'dispatched', 'Design dispatched to you',
    format('%s has been dispatched by Head Office. Mark it received on arrival.', public._sku(t.design_id)),
    t.design_id, p_transfer);
end $$;

create or replace function public.receive_transfer(p_transfer uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.transfers := public._lock_transfer(p_transfer); v_dest uuid; v_final public.transfer_status;
begin
  perform public._require_role(array['shop_user','head_office','super_admin']::public.app_role[]);
  if t.status = 'dispatched_to_requester' then v_dest := t.to_outlet_id; v_final := 'completed';
  elsif t.status = 'dispatched_to_origin' then v_dest := t.from_outlet_id; v_final := 'returned';
  else perform public._fail('This transfer has not been dispatched to an outlet.'); end if;
  if not (public.is_staff() or v_dest = public.auth_outlet()) then perform public._fail('Only the receiving outlet can mark this received.'); end if;
  perform public._lock_design(t.design_id);

  update public.transfers set status = v_final, received_by = auth.uid(), received_at = now() where id = p_transfer;
  update public.designs set status = 'available', current_outlet_id = v_dest,
    location_since = case when v_final = 'completed' then now()
                          else coalesce(t.prev_location_since, location_since) end
  where id = t.design_id;
  perform public._move_location(t.design_id, v_dest);
  perform public._log(t.design_id, p_transfer, 'received', v_dest, jsonb_build_object('result', v_final));
  perform public._notify_staff('received', 'Transfer closed',
    format('%s was received (%s).', public._sku(t.design_id), v_final), t.design_id, p_transfer);
end $$;

-- ---------------------------------------------------------------------
-- HEAD OFFICE TOOLS
-- ---------------------------------------------------------------------
create or replace function public.ho_relocate(p_id uuid, p_outlet uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.designs; t public.transfers;
begin
  perform public._require_role(array['head_office','super_admin']::public.app_role[]);
  d := public._lock_design(p_id);
  if length(trim(coalesce(p_reason,''))) < 5 then perform public._fail('A reason (min 5 characters) is required.'); end if;
  if d.status in ('sold') then perform public._fail('Sold designs cannot be relocated.'); end if;
  if d.status = 'in_transfer' then perform public._fail('Design is in transfer; finish the transfer first.'); end if;
  if p_outlet = d.current_outlet_id then perform public._fail('Design is already at that outlet.'); end if;
  if not exists (select 1 from public.outlets where id = p_outlet and active) then perform public._fail('Outlet is not valid.'); end if;

  if d.status = 'requested' then
    select * into t from public.transfers where design_id = p_id and status = 'requested' for update;
    update public.transfers set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now() where id = t.id;
    perform public._log(p_id, t.id, 'request_cancelled', d.current_outlet_id, '{"by":"ho_relocate"}');
    perform public._notify_outlet(t.to_outlet_id, 'request_cancelled', 'Request cancelled',
      format('%s was relocated by Head Office; your request was cancelled.', d.sku), p_id, t.id);
  end if;
  if d.status = 'on_hold' then perform public._release_active_hold(p_id, 'Released: relocated by HO'); end if;

  update public.designs set current_outlet_id = p_outlet, location_since = now(), status = 'available' where id = p_id;
  perform public._move_location(p_id, p_outlet);
  perform public._log(p_id, null, 'relocated', p_outlet,
    jsonb_build_object('from', d.current_outlet_id, 'to', p_outlet, 'reason', trim(p_reason)));
  perform public._notify_outlet(d.current_outlet_id, 'relocated', 'Design relocated',
    format('%s was moved by Head Office: %s', d.sku, trim(p_reason)), p_id, null);
  perform public._notify_outlet(p_outlet, 'relocated', 'Design relocated to you',
    format('%s was moved to your outlet by Head Office.', d.sku), p_id, null);
end $$;

create or replace function public.soft_delete_design(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.designs; t public.transfers;
begin
  perform public._require_role(array['head_office','super_admin']::public.app_role[]);
  d := public._lock_design(p_id);
  if length(trim(coalesce(p_reason,''))) < 5 then perform public._fail('A reason (min 5 characters) is required.'); end if;
  for t in select * from public.transfers where design_id = p_id
             and status not in ('rejected','cancelled','completed','returned') for update loop
    update public.transfers set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now() where id = t.id;
    perform public._log(p_id, t.id, 'request_cancelled', t.to_outlet_id, '{"by":"soft_delete"}');
  end loop;
  perform public._release_active_hold(p_id, 'Released: design deleted');
  update public.designs set status = 'deleted', deleted_at = now(), deleted_by = auth.uid(),
    delete_reason = trim(p_reason) where id = p_id;
  perform public._log(p_id, null, 'deleted', d.current_outlet_id,
    jsonb_build_object('reason', trim(p_reason), 'from_status', d.status));
end $$;

create or replace function public.restore_design(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.designs;
begin
  perform public._require_role(array['super_admin']::public.app_role[]);
  select * into d from public.designs where id = p_id for update;
  if not found or d.deleted_at is null then perform public._fail('Design is not deleted.'); end if;
  update public.designs set status = case when sold_at is not null then 'sold'::public.design_status else 'available' end,
    deleted_at = null, deleted_by = null, delete_reason = null where id = p_id;
  perform public._log(p_id, null, 'restored', d.current_outlet_id, jsonb_build_object('delete_reason', d.delete_reason));
end $$;

-- ---------------------------------------------------------------------
-- IMAGE CORRECTIONS (HO → owner)
-- ---------------------------------------------------------------------
create or replace function public.request_image_correction(p_id uuid, p_kinds public.media_kind[], p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare d public.designs; v uuid;
begin
  perform public._require_role(array['head_office','super_admin']::public.app_role[]);
  d := public._lock_design(p_id);
  if p_kinds is null or cardinality(p_kinds) = 0 then perform public._fail('Pick at least one image.'); end if;
  if length(trim(coalesce(p_note,''))) < 3 then perform public._fail('A note is required.'); end if;
  insert into public.image_corrections (design_id, kinds, note, requested_by)
  values (p_id, p_kinds, trim(p_note), auth.uid()) returning id into v;
  update public.designs set media_flag = true where id = p_id;
  perform public._log(p_id, null, 'image_correction_requested', d.current_outlet_id,
    jsonb_build_object('kinds', p_kinds, 'note', trim(p_note)));
  perform public._notify_outlet(d.current_outlet_id, 'image_correction', 'Fix images requested',
    format('%s: %s', d.sku, trim(p_note)), p_id, null);
  return v;
end $$;

create or replace function public.resolve_image_correction(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.designs := public._lock_design(p_id); v_since timestamptz;
begin
  if not public._can_manage(d) then perform public._fail('Only the owner outlet or Head Office can resolve this.'); end if;
  select min(requested_at) into v_since from public.image_corrections where design_id = p_id and resolved_at is null;
  if v_since is null then perform public._fail('No open image correction.'); end if;
  if not exists (select 1 from public.design_media where design_id = p_id and is_current and created_at > v_since) then
    perform public._fail('Replace at least one image first.');
  end if;
  update public.image_corrections set resolved_at = now(), resolved_by = auth.uid() where design_id = p_id and resolved_at is null;
  update public.designs set media_flag = false where id = p_id;
  perform public._log(p_id, null, 'image_corrected', d.current_outlet_id, '{}');
  perform public._notify_staff('image_corrected', 'Images fixed', format('%s images were replaced.', d.sku), p_id, null);
end $$;

-- ---------------------------------------------------------------------
-- IMAGE NOT CLEAR VOTES (indicator only)
-- ---------------------------------------------------------------------
create or replace function public._recount_votes(p_id uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  select count(*) into n from public.image_votes where design_id = p_id and resolved_at is null;
  update public.designs set unclear_votes = n where id = p_id;
  return n;
end $$;

create or replace function public.vote_image_unclear(p_id uuid, p_kinds public.media_kind[] default null,
  p_note text default null) returns int
language plpgsql security definer set search_path = '' as $$
declare v_role public.app_role := public._require_role(array['shop_user','head_office','super_admin']::public.app_role[]);
        d public.designs := public._lock_design(p_id); n int;
begin
  if v_role = 'shop_user' and d.current_outlet_id = public.auth_outlet() then
    perform public._fail('You cannot vote on your own outlet''s images.');
  end if;
  if exists (select 1 from public.image_votes where design_id = p_id and voter_id = auth.uid() and resolved_at is null) then
    perform public._fail('You already have an open vote on this design.');
  end if;
  insert into public.image_votes (design_id, voter_id, voter_outlet_id, owner_outlet_id, kinds, note)
  values (p_id, auth.uid(), public.auth_outlet(), d.current_outlet_id,
          nullif(p_kinds, '{}'), nullif(trim(p_note),''));
  n := public._recount_votes(p_id);
  perform public._log(p_id, null, 'image_voted_unclear', d.current_outlet_id,
    jsonb_build_object('kinds', p_kinds, 'note', p_note, 'voter_outlet', public.auth_outlet(), 'open_votes', n));
  perform public._notify_outlet(d.current_outlet_id, 'image_vote', 'Images marked unclear',
    format('%s · %s open vote(s). Please re-upload clearer images.', d.sku, n), p_id, null);
  return n;
end $$;

create or replace function public.withdraw_vote(p_id uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare d public.designs; n int;
begin
  perform public._require_role(array['shop_user','head_office','super_admin']::public.app_role[]);
  d := public._lock_design(p_id);
  update public.image_votes set resolved_at = now(), resolved_by = auth.uid(), withdrawn = true
  where design_id = p_id and voter_id = auth.uid() and resolved_at is null;
  if not found then perform public._fail('You have no open vote on this design.'); end if;
  n := public._recount_votes(p_id);
  perform public._log(p_id, null, 'image_vote_withdrawn', d.current_outlet_id, jsonb_build_object('open_votes', n));
  return n;
end $$;

create or replace function public.resolve_image_votes(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.designs := public._lock_design(p_id); v_since timestamptz; v_voters uuid[]; v uuid;
begin
  if not public._can_manage(d) then perform public._fail('Only the owner outlet or Head Office can resolve votes.'); end if;
  select min(created_at), array_agg(voter_id) into v_since, v_voters
    from public.image_votes where design_id = p_id and resolved_at is null;
  if v_since is null then return; end if;
  if not exists (select 1 from public.design_media where design_id = p_id and is_current and created_at > v_since) then
    perform public._fail('Replace at least one image before resolving votes.');
  end if;
  update public.image_votes set resolved_at = now(), resolved_by = auth.uid() where design_id = p_id and resolved_at is null;
  update public.designs set unclear_votes = 0 where id = p_id;
  perform public._log(p_id, null, 'image_votes_resolved', d.current_outlet_id, jsonb_build_object('votes', cardinality(v_voters)));
  foreach v in array v_voters loop
    perform public._notify_user(v, 'image_votes_resolved', 'Images updated',
      format('%s has new images after your vote.', d.sku), p_id, null);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids bigint[] default null) returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids));
$$;

-- ---------------------------------------------------------------------
-- GRANTS: clients may execute the public API only.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function
  public._fail(text), public._require_role(public.app_role[]),
  public._log(uuid, uuid, text, uuid, jsonb),
  public._notify_outlet(uuid, text, text, text, uuid, uuid),
  public._notify_staff(text, text, text, uuid, uuid),
  public._notify_user(uuid, text, text, text, uuid, uuid),
  public._lock_design(uuid), public._lock_transfer(uuid),
  public._can_manage(public.designs), public._object_exists(text, text),
  public._move_location(uuid, uuid), public._release_active_hold(uuid, text),
  public._sku(uuid), public._insert_hold(public.designs, int, text, text, text, uuid),
  public._recount_votes(uuid), public.release_expired_holds(),
  public.tg_touch_updated_at()
from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------
-- pg_cron: hourly hold expiry (needs the function above to exist)
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('release-expired-holds', '5 * * * *', $$select public.release_expired_holds()$$);
