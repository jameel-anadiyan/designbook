-- =====================================================================
-- Design Book · 0002_rls.sql
-- Helper functions, RLS on every table, storage buckets + policies.
-- Clients never write designs / holds / transfers / media / votes /
-- corrections / events / notifications directly: RPC only (0003).
-- =====================================================================

-- HELPERS -------------------------------------------------------------
create or replace function public.auth_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active
$$;

create or replace function public.auth_outlet() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.outlet_id from public.profiles p where p.id = auth.uid() and p.active
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.auth_role() in ('head_office','super_admin'), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.auth_role() = 'super_admin', false)
$$;

create or replace function public.head_office_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select o.id from public.outlets o where o.is_head_office limit 1
$$;

-- ENABLE RLS EVERYWHERE -------------------------------------------------
alter table public.outlets           enable row level security;
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.app_settings      enable row level security;
alter table public.designs           enable row level security;
alter table public.design_media      enable row level security;
alter table public.holds             enable row level security;
alter table public.transfers         enable row level security;
alter table public.image_corrections enable row level security;
alter table public.image_votes       enable row level security;
alter table public.design_locations  enable row level security;
alter table public.design_events     enable row level security;
alter table public.notifications     enable row level security;
alter table public.login_attempts    enable row level security;  -- no policies: service role only

-- OUTLETS ----------------------------------------------------------------
create policy outlets_select on public.outlets for select to authenticated
  using (public.auth_role() is not null);
create policy outlets_admin_insert on public.outlets for insert to authenticated
  with check (public.is_admin());
create policy outlets_admin_update on public.outlets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- CATEGORIES (HO + admin manage) --------------------------------------------
create policy categories_select on public.categories for select to authenticated
  using (public.auth_role() is not null);
create policy categories_staff_insert on public.categories for insert to authenticated
  with check (public.is_staff());
create policy categories_staff_update on public.categories for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- APP SETTINGS ----------------------------------------------------------------
create policy settings_select on public.app_settings for select to authenticated
  using (public.auth_role() is not null);
create policy settings_admin_write on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy settings_admin_insert on public.app_settings for insert to authenticated
  with check (public.is_admin());

-- PROFILES: own row; HO + admin see all. Writes via Edge Functions only. --------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

-- Directory of names for timelines / tables (no contact data, no lock data).
create view public.people with (security_invoker = false) as
  select p.id, p.full_name, p.username, p.role, p.outlet_id, p.active
  from public.profiles p
  where auth.uid() is not null;
revoke all on public.people from anon;
grant select on public.people to authenticated;

-- DESIGNS: everyone signed in reads non-deleted; staff also deleted. NO writes. --
create policy designs_select on public.designs for select to authenticated
  using (public.auth_role() is not null and (deleted_at is null or public.is_staff()));

-- MEDIA / HOLDS / TRANSFERS / CORRECTIONS / VOTES: read for signed-in users. -----
create policy media_select on public.design_media for select to authenticated
  using (public.auth_role() is not null);
create policy holds_select on public.holds for select to authenticated
  using (public.auth_role() is not null);
create policy transfers_select on public.transfers for select to authenticated
  using (public.auth_role() is not null);
create policy corrections_select on public.image_corrections for select to authenticated
  using (public.auth_role() is not null);
create policy votes_select on public.image_votes for select to authenticated
  using (public.is_staff() or voter_id = auth.uid() or owner_outlet_id = public.auth_outlet());
create policy locations_select on public.design_locations for select to authenticated
  using (public.auth_role() is not null);

-- EVENTS: own outlet's designs; HO/admin all. Never update/delete. ------------------
create policy events_select on public.design_events for select to authenticated
  using (
    public.is_staff()
    or outlet_id = public.auth_outlet()
    or exists (select 1 from public.designs d
               where d.id = design_events.design_id
                 and (d.current_outlet_id = public.auth_outlet()
                      or d.origin_outlet_id = public.auth_outlet()))
  );

-- NOTIFICATIONS: own only. Read flag via RPC. --------------------------------------
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());

-- Realtime for the notification bell
alter publication supabase_realtime add table public.notifications;

-- =====================================================================
-- STORAGE
-- design-media : {design_id}/{kind}/{uuid}.webp|.mp4
-- documents    : {holds|rejections|invoices}/{design_id|transfer_id}/{uuid}-{file}
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('design-media', 'design-media', false, 52428800,
     array['image/webp','image/jpeg','image/png','video/mp4','video/quicktime']),
  ('documents', 'documents', false, 10485760, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Can the caller write media for this design id?
-- staff: always · shop: design is at their outlet, or the id is not used yet
-- (media is uploaded before create_design inserts the row).
create or replace function public.can_write_design_media(p_design text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid; v_outlet uuid; v_status public.design_status;
begin
  if public.auth_role() is null then return false; end if;
  if public.is_staff() then return true; end if;
  begin v_id := p_design::uuid; exception when others then return false; end;
  select d.current_outlet_id, d.status into v_outlet, v_status from public.designs d where d.id = v_id;
  if not found then return true; end if;
  return v_outlet = public.auth_outlet() and v_status not in ('deleted');
end $$;

-- Can the caller read this document?
create or replace function public.can_read_document(p_name text, p_owner uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_folder text; v_ref uuid; v_my uuid := public.auth_outlet();
begin
  if public.auth_role() is null then return false; end if;
  if public.is_staff() or p_owner = auth.uid() then return true; end if;
  v_folder := split_part(p_name, '/', 1);
  begin v_ref := split_part(p_name, '/', 2)::uuid; exception when others then return false; end;
  if v_folder in ('holds','invoices') then
    return exists (select 1 from public.designs d where d.id = v_ref
                   and (d.current_outlet_id = v_my or d.origin_outlet_id = v_my))
        or exists (select 1 from public.holds h where h.design_id = v_ref and h.outlet_id = v_my);
  elsif v_folder = 'rejections' then
    return exists (select 1 from public.transfers t where t.id = v_ref
                   and (t.from_outlet_id = v_my or t.to_outlet_id = v_my));
  end if;
  return false;
end $$;

create policy "design-media read" on storage.objects for select to authenticated
  using (bucket_id = 'design-media' and public.auth_role() is not null);
create policy "design-media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'design-media'
              and public.can_write_design_media(split_part(name, '/', 1)));
-- (no update/delete policies: replaced media are new objects; history is kept)

create policy "documents read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.can_read_document(name, owner));
create policy "documents insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents'
              and public.auth_role() is not null
              and split_part(name, '/', 1) in ('holds','rejections','invoices'));
