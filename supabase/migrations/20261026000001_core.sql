-- =====================================================================
-- Design Book · 0001_core.sql
-- Core schema: enums, tables, indexes, list view.
-- Source: docs/BUILD_PLAN.md › "Supabase data model" (+ notifications,
-- app_settings, login_attempts added; see implementation plan).
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ENUMS ---------------------------------------------------------------
create type public.app_role as enum ('super_admin','head_office','shop_user');
create type public.design_status as enum ('available','on_hold','requested','in_transfer','sold','deleted');
create type public.transfer_status as enum (
  'requested','rejected','cancelled','accepted','sent_to_ho','received_at_ho',
  'dispatched_to_requester','dispatched_to_origin','completed','returned');
create type public.media_kind as enum ('thumbnail','front','angle_1','angle_2','angle_3',
  'video','barcode_front','barcode_back');

-- OUTLETS (Head Office is also an outlet row, is_head_office = true) -----
create table public.outlets (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[A-Z0-9_-]{2,12}$'),
  name text not null,
  address text, phone text,
  is_head_office boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now());
-- only one head office
create unique index one_head_office on public.outlets (is_head_office) where is_head_office;

-- PROFILES (1:1 with auth.users) ----------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_.]{3,30}$'),
  full_name text not null check (length(trim(full_name)) >= 2),
  email text unique not null,
  phone text not null,
  address text,
  role public.app_role not null,
  outlet_id uuid references public.outlets,
  active boolean not null default true,
  must_change_password boolean not null default true,  -- true until the temp passcode is changed
  failed_logins int not null default 0,                -- wrong passcode count
  locked_until timestamptz,                            -- set for 15 min after 5 wrong passcodes
  last_login_at timestamptz,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  constraint shop_needs_outlet check (role <> 'shop_user' or outlet_id is not null));
create index on public.profiles (outlet_id);

-- CATEGORIES -------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now());

-- APP SETTINGS (age bands etc.; editable by super_admin) -------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles);

-- DESIGNS ------------------------------------------------------------------
create table public.designs (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null check (sku = upper(sku) and length(sku) between 1 and 40),
  barcode text unique not null check (length(barcode) between 1 and 64),
  category_id uuid not null references public.categories,
  mrp numeric(12,2) not null check (mrp > 0),
  -- no qty column: each design row is one physical piece
  title text, notes text,
  origin_outlet_id uuid not null references public.outlets,   -- where it was first uploaded
  current_outlet_id uuid not null references public.outlets,  -- where it physically is now
  location_since timestamptz not null default now(),          -- drives the AGE tag
  status public.design_status not null default 'available',
  media_flag boolean not null default false,                  -- true = HO asked for image correction
  unclear_votes int not null default 0,                       -- open "image not clear" votes
  sold_at timestamptz, sold_by uuid references public.profiles,
  sold_invoice_no text, sold_invoice_path text,               -- invoice is mandatory to mark sold
  sold_amount numeric(12,2) check (sold_amount is null or sold_amount >= 0),
  deleted_at timestamptz, deleted_by uuid references public.profiles, delete_reason text,
  created_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sold_needs_invoice check (status <> 'sold'
    or (sold_invoice_no is not null and sold_invoice_path is not null)),
  constraint deleted_needs_reason check (status <> 'deleted'
    or (deleted_at is not null and delete_reason is not null)));
create index on public.designs (current_outlet_id, status);
create index on public.designs (category_id);
create index on public.designs (mrp);
create index on public.designs (created_at desc);
create index on public.designs (location_since);
create index designs_sku_trgm on public.designs using gin (sku extensions.gin_trgm_ops);
create index designs_barcode_trgm on public.designs using gin (barcode extensions.gin_trgm_ops);

-- MEDIA (keep old versions; only one current per kind) ------------------------
create table public.design_media (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs,
  kind public.media_kind not null,
  storage_path text not null, mime text, bytes int, width int, height int,
  duration_s numeric(6,2),
  is_current boolean not null default true,
  uploaded_by uuid references public.profiles,
  created_at timestamptz not null default now());
create unique index one_current_media on public.design_media (design_id, kind) where is_current;

-- HOLDS ------------------------------------------------------------------------
create table public.holds (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs,
  outlet_id uuid not null references public.outlets,
  reason text not null check (length(trim(reason)) >= 5),
  doc_path text not null,                          -- mandatory supporting document
  days int not null check (days between 1 and 30), -- chosen by the shop
  expires_at timestamptz not null,                 -- held_at + days; auto-released by pg_cron
  hold_no int not null,                            -- 1st, 2nd, 3rd... hold of this design at this outlet
  source text not null default 'manual' check (source in ('manual','rejection')),
  transfer_id uuid,                                -- the rejected request (FK added below)
  expiry_notified boolean not null default false,  -- "expires in 1 day" notification sent
  held_by uuid not null references public.profiles,
  held_at timestamptz not null default now(),
  released_at timestamptz, released_by uuid references public.profiles, release_note text);
create unique index one_active_hold on public.holds (design_id) where released_at is null;
create index on public.holds (design_id, outlet_id);
create index on public.holds (expires_at) where released_at is null;

-- TRANSFERS --------------------------------------------------------------------
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs,
  from_outlet_id uuid not null references public.outlets,   -- owner at request time
  to_outlet_id uuid not null references public.outlets,     -- requester
  status public.transfer_status not null default 'requested',
  request_note text,
  requested_by uuid not null references public.profiles,
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles, decided_at timestamptz,
  reject_reason text, reject_doc_path text,
  reject_hold_days int check (reject_hold_days between 1 and 30),
  cancelled_by uuid references public.profiles, cancelled_at timestamptz,
  sent_to_ho_by uuid references public.profiles, sent_to_ho_at timestamptz,
  ho_received_by uuid references public.profiles, ho_received_at timestamptz,
  ho_dispatched_by uuid references public.profiles, ho_dispatched_at timestamptz, ho_note text,
  prev_location_since timestamptz,   -- saved at accept; restored on return to origin (age continues)
  received_by uuid references public.profiles, received_at timestamptz,
  constraint different_outlets check (from_outlet_id <> to_outlet_id),
  constraint reject_needs_reason check (status <> 'rejected'
    or (reject_reason is not null and reject_doc_path is not null
        and reject_hold_days is not null)));
create unique index one_open_transfer on public.transfers (design_id)
  where status not in ('rejected','cancelled','completed','returned');
create index on public.transfers (from_outlet_id, status);
create index on public.transfers (to_outlet_id, status);
create index on public.transfers (status);
alter table public.holds add foreign key (transfer_id) references public.transfers;

-- IMAGE CORRECTION REQUESTS (HO → shop) -------------------------------------------
create table public.image_corrections (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs,
  kinds public.media_kind[] not null check (cardinality(kinds) > 0),
  note text not null check (length(trim(note)) >= 3),
  requested_by uuid not null references public.profiles,
  requested_at timestamptz not null default now(),
  resolved_by uuid references public.profiles, resolved_at timestamptz);
create index on public.image_corrections (design_id) where resolved_at is null;

-- IMAGE NOT CLEAR VOTES (any user outside the owner outlet; one open vote per user per design)
create table public.image_votes (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs,
  voter_id uuid not null references public.profiles,
  voter_outlet_id uuid references public.outlets,
  owner_outlet_id uuid not null references public.outlets,  -- owner outlet at vote time (reports)
  kinds public.media_kind[],              -- which images are unclear (optional)
  note text,
  created_at timestamptz not null default now(),
  withdrawn boolean not null default false,
  resolved_at timestamptz, resolved_by uuid references public.profiles);  -- set when owner re-uploads / voter withdraws
create unique index one_open_vote on public.image_votes (design_id, voter_id) where resolved_at is null;

-- LOCATION HISTORY (one row per stay; used by the age report) -----------------------
create table public.design_locations (
  id bigserial primary key,
  design_id uuid not null references public.designs,
  outlet_id uuid not null references public.outlets,
  arrived_at timestamptz not null, left_at timestamptz);
create index on public.design_locations (design_id) where left_at is null;

-- AUDIT / EVENT LOG (append-only, source for every report) ----------------------------
create table public.design_events (
  id bigserial primary key,
  design_id uuid references public.designs,
  transfer_id uuid references public.transfers,
  event text not null,       -- 'created','edited','media_replaced','sold','unsold','hold','hold_released',
                             -- 'requested','request_cancelled','accepted','rejected','sent_to_ho','ho_received',
                             -- 'forwarded','returned_to_origin','received','relocated',
                             -- 'image_correction_requested','image_corrected','image_voted_unclear',
                             -- 'image_vote_withdrawn','image_votes_resolved','deleted','restored'
  outlet_id uuid references public.outlets,
  actor_id uuid references public.profiles,
  data jsonb not null default '{}',
  created_at timestamptz not null default now());
create index on public.design_events (event, created_at);
create index on public.design_events (design_id, created_at);
create index on public.design_events (actor_id, created_at);

-- NOTIFICATIONS (fan-out: one row per recipient; Realtime) -------------------------------
create table public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null,
  title text not null,
  body text,
  design_id uuid references public.designs,
  transfer_id uuid references public.transfers,
  created_at timestamptz not null default now(),
  read_at timestamptz);
create index on public.notifications (user_id, created_at desc);
create index on public.notifications (user_id) where read_at is null;

-- LOGIN ATTEMPTS (IP rate-limit for login-by-username; service role only) -------------------
create table public.login_attempts (
  id bigserial primary key,
  ip text not null,
  username text,
  ok boolean not null,
  created_at timestamptz not null default now());
create index on public.login_attempts (ip, created_at desc);

-- updated_at trigger --------------------------------------------------------------------------
create or replace function public.tg_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger designs_touch before update on public.designs
  for each row execute function public.tg_touch_updated_at();

-- LIST VIEW used by every grid (age computed, deleted hidden) ----------------------------------
create view public.designs_v with (security_invoker = true) as
select d.*,
  floor(extract(epoch from now() - d.location_since)/86400)::int as age_days,
  case d.status when 'in_transfer' then 1
                when 'sold' then 2
                else 0 end as status_group,               -- 0 available-ish · 1 in transfer · 2 sold
  o.name as outlet_name, o.code as outlet_code, o.is_head_office as at_head_office,
  oo.name as origin_outlet_name,
  c.name as category_name,
  h.id as hold_id, h.hold_no, h.expires_at as hold_expires_at, h.reason as hold_reason,
  h.source as hold_source,
  t.id as open_transfer_id, t.status as transfer_status,
  t.from_outlet_id as transfer_from_outlet_id, t.to_outlet_id as transfer_to_outlet_id,
  case when t.ho_received_at is not null and t.status in ('received_at_ho')
       then floor(extract(epoch from now() - t.ho_received_at)/86400)::int end as transit_days,
  (select m.storage_path from public.design_media m
     where m.design_id = d.id and m.kind = 'thumbnail' and m.is_current) as thumb_path
from public.designs d
join public.outlets o on o.id = d.current_outlet_id
join public.outlets oo on oo.id = d.origin_outlet_id
join public.categories c on c.id = d.category_id
left join public.holds h on h.design_id = d.id and h.released_at is null
left join public.transfers t on t.design_id = d.id
  and t.status not in ('rejected','cancelled','completed','returned')
where d.deleted_at is null;
