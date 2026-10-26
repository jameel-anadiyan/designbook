# Design Book Web App — Build Plan for Antigravity
Oct 26, 2026 · @MOHAMED JAMEEL ANADIYAN
Overview
Design Book is a private, multi-outlet catalogue where shops upload each physical design (SKU, barcode, MRP, media), see every outlet's stock, and move pieces between outlets through Head Office with a full audit trail. It is built in Antigravity as a React (Vite + TypeScript) app on Vercel, with Supabase for auth, Postgres, storage and server logic.
What the app must do
	•	Three roles: Super Admin, Head Office, Shop User. Users are created by an admin, never self-registered.
	•	Shops upload designs with strict media rules: thumbnail, front + 3 angles, a video, barcode front and back, all cropped before upload.
	•	MRP is typed twice and must match. SKU and barcode are unique across the whole business.
	•	Every design carries an age tag: days since it arrived at its current outlet.
	•	Marking a design sold requires an invoice upload. No shop can delete a design. Only Head Office/Admin can delete, and only as a soft delete.
	•	Inter-outlet transfer: request → accept/reject → send to HO → HO receives → HO forwards or returns → requester receives. Age resets when the requester receives it; a return to origin keeps the original age.
	•	Any outlet user can vote "Image not clear" on another outlet's design; votes show an indicator asking the owner outlet to re-upload the images (nothing is forced or blocked), and HO/Admin see a votes report. Rich filters, a 1–4 tile grid, and reports for HO and Admin.
Assumptions this plan makes (confirmed 26 Oct 2026; see Decisions)
	•	One shop user belongs to exactly one outlet; an outlet can have several users.
	•	Each design is one physical piece: there is no quantity field, and a transfer moves that one piece.
	•	"Hold" means the owning outlet reserves a design (e.g. for a customer); a held design cannot be requested. Each hold lasts 1–30 days (chosen by the shop), needs a reason and document, and is numbered per design per outlet (Hold #1, #2, #3…).
	•	Login is by username + a 6-digit numeric passcode for every role. Supabase Auth needs an email, so each user has a real email stored and login resolves username → email server-side.
	•	Currency is INR; dates shown in IST.
Tech stack and Antigravity setup
Set up the workspace rules before the first prompt so every agent run follows the same conventions; Antigravity reads AGENTS.md and every file in .agents/rules/ automatically (Antigravity docs, rules guide).
Layer
Choice
Why
Frontend
React 18 + Vite + TypeScript
Fast builds, simple Vercel deploy
UI
Tailwind CSS + shadcn/ui
Responsive grid, accessible dialogs, tables; themed to SWA white + teal tokens
Routing
React Router v6
Role-guarded route trees
Server state
TanStack Query
Caching, pagination, optimistic updates
Forms
React Hook Form + Zod
MRP double-entry match, required media checks
Image crop
react-easy-crop
Touch-friendly crop on mobile
Image compress
browser-image-compression
Resize to max 2000 px, WebP, before upload
Barcode scan
@zxing/browser (fallback: html5-qrcode)
Camera scan for EAN-13, Code-128, QR
Video
Native <input capture> + upload size cap
Keep it simple; transcoding later if needed
Tables/reports
TanStack Table + Recharts
Sortable reports, rankings, charts
Export
SheetJS (xlsx) + CSV
Download every report
Backend
Supabase: Auth, Postgres, Storage, Edge Functions, RLS
One platform for data, files, permissions
Hosting
Vercel (preview per branch, prod on main)
Env vars per environment
Gallery
Embla Carousel + yet-another-react-lightbox (white background) + TanStack Virtual
Swipe, pinch zoom, slideshow, smooth long grids
Fonts
Cormorant Garamond + Jost (Google Fonts)
Matches the logo's serif and wide-spaced lettering
Workspace structure to create first
design-book/ ├── AGENTS.md                  # project identity, stack, glossary ├── .agents/ │   ├── rules/ │   │   ├── 01-stack.md        # versions, libraries, no other UI libs │   │   ├── 02-security.md     # RLS on every table, no service key in client │   │   ├── 03-data-rules.md   # statuses, no shop deletes, MRP rules, age │   │   ├── 04-ui.md           # SWA white + teal only, no dark tones, gallery views, mobile-first │   │   └── 05-testing.md      # each phase ends with tests + walkthrough │   └── workflows/ │       ├── new-phase.md       # read plan → plan artifact → build → test │       └── db-change.md       # write migration → apply → regen types ├── docs/BUILD_PLAN.md         # export of this document ├── supabase/ │   ├── migrations/ │   └── functions/ └── src/     ├── app/ (routes, layouts, guards)     ├── features/ (designs, transfers, holds, users, reports)     ├── components/ (ui, media, barcode, filters)     └── lib/ (supabase client, types, utils)
Paste into AGENTS.md (keep each rules file under the 12,000-character limit):
# Design Book Private multi-outlet design catalogue. Roles: super_admin, head_office, shop_user. Stack: React+Vite+TS, Tailwind, shadcn/ui, TanStack Query, RHF+Zod, Supabase, Vercel. Source of truth for features: docs/BUILD_PLAN.md. Build one phase at a time. Never: use the Supabase service_role key in frontend code; hard-delete designs; let a shop_user change status outside the allowed transitions (enforced in SQL). All status changes go through Postgres RPC functions, never direct UPDATEs. Every table has RLS enabled. Every mutation writes a row to design_events. Brand: SWA Diamonds. White + teal (#00737D) only, light theme only, no dark backgrounds or dark mode anywhere. Fonts: Cormorant Garamond + Jost. Logo in /public/brand. Mobile-first: test every screen at 375px, 768px, 1024px, 1280px.
Antigravity working style
	•	Give the agent docs/BUILD_PLAN.md and one phase at a time (section "Phased build plan").
	•	Ask for a Plan artifact first; review it before letting it write code.
	•	Use review-driven mode for SQL migrations and RLS; let it run more freely on UI.
	•	Connect the Supabase MCP server so the agent can read the live schema instead of guessing.
	•	End every phase by asking for a Walkthrough artifact with screenshots at 375 px and 1280 px.
Roles and permissions
Permissions are enforced in Postgres (RLS + RPC functions), not only by hiding buttons; the UI simply mirrors this matrix.
Capability
Shop User
Head Office
Super Admin
Log in with 6-digit passcode, change own passcode and profile
Yes
Yes
Yes
Forced passcode change on first login (temp passcode)
Yes
Yes
Yes
Upload a design
Own outlet
Any outlet
Any outlet
Edit design details
Own outlet, not in transfer
Any
Any
Mark sold (invoice upload required) / unmark sold
Own outlet
Any
Any
Delete design (soft)
No
Yes, with reason
Yes, with reason
View All Designs (every outlet)
Yes
Yes
Yes
Request a design from another outlet
Yes
n/a
n/a
Accept / reject incoming request
Own outlet
Override
Override
Put on hold / release hold
Own outlet
Any
Any
Mark "sent to Head Office"
Own outlet (after accept)
n/a
n/a
Mark received at HO, forward or return to origin
No
Yes
Yes
Mark received at requesting outlet
Own outlet
Yes
Yes
Change a design's location directly
No
Yes, with reason
Yes
Raise image-correction request
No
Yes
Yes
Resolve image-correction (re-upload media)
Own outlet
Yes
Yes
Vote "Image not clear"
Other outlets' designs
Yes
Yes
Fix images after votes (re-upload)
Own outlet
Yes
Yes
View image-vote report
No
Yes
Yes
Reports
Own outlet summary
All reports
All reports
Create/disable/unlock users, reset temp passcode
No
No (Super Admin only)
All users
Manage outlets and categories
No
Categories
Yes
View audit log
Own designs
Yes
Yes
User fields (all roles): full name, username (unique), email (unique), contact number, address, role, outlet (shop users only), active flag, must_change_password flag.
Product lifecycle and transfer flow
A design is requestable only while available; every other status blocks requests, and only the database functions can move a design between statuses.

transfer flow · 3 roles, 2 decisions
The owner decides first, Head Office decides second; a receipt at the requesting outlet restarts the age, while a return to origin keeps the original age.
Design status
Set when
Requestable
Shop can edit
available
Uploaded, received, hold released or expired, request cancelled
Yes
Yes
on_hold
Owner places a 1–30 day hold (reason + document) or rejects a request; numbered per design per outlet; auto-released at expiry
No
Yes
requested
Another outlet requests it
No
No
in_transfer
Owner accepts; stays until an outlet marks it received
No
No
sold
Owner or HO marks sold (shown in the last group)
No
No
deleted
HO/admin soft-deletes with reason (hidden from shops)
No
No
Age rule: age_days = today − location_since. location_since is set at upload, at receipt by the requesting outlet, and on an HO direct relocation. A return to origin restores the saved date, so the age continues. While at Head Office, the design shows a separate "days in transit" counter instead.
Sold rule: Mark sold opens a dialog with invoice number, invoice file (photo, PDF or any document) and optional sale amount. The database refuses sold without both invoice number and file, and the invoice is viewable from the design detail and the Sold report. The shop can reverse a sale (Unmark sold) at any time; the reversal is logged.
Hold rule: A hold is placed from My Designs or automatically when a request is rejected. The shop picks 1–30 days, writes a reason and uploads a document every time. Each hold is numbered for that design at that outlet (Hold #1, #2, #3…) and shown on the tile as On hold #3 · 5 days left; a pg_cron job releases it at expiry. HO and Admin dashboards show hold counts and repeat holds.
Supabase data model
Ten tables cover everything; every status change is written once to design_events, which feeds the audit log and all reports. Give this block to the agent as migration 0001_core.sql.
-- ENUMS create type app_role as enum ('super_admin','head_office','shop_user'); create type design_status as enum ('available','on_hold','requested','in_transfer','sold','deleted'); create type transfer_status as enum (   'requested','rejected','cancelled','accepted','sent_to_ho','received_at_ho',   'dispatched_to_requester','dispatched_to_origin','completed','returned'); create type media_kind as enum ('thumbnail','front','angle_1','angle_2','angle_3',   'video','barcode_front','barcode_back');  -- OUTLETS (Head Office is also an outlet row, is_head_office = true) create table outlets (   id uuid primary key default gen_random_uuid(),   code text unique not null, name text not null,   address text, phone text,   is_head_office boolean not null default false,   active boolean not null default true,   created_at timestamptz default now());  -- PROFILES (1:1 with auth.users) create table profiles (   id uuid primary key references auth.users on delete cascade,   username text unique not null check (username ~ '^[a-z0-9_.]{3,30}$'),   full_name text not null, email text unique not null,   phone text not null, address text,   role app_role not null,   outlet_id uuid references outlets,   active boolean not null default true,   must_change_password boolean not null default true,  -- true until the temp passcode is changed   failed_logins int not null default 0,               -- wrong passcode count   locked_until timestamptz,                           -- set for 15 min after 5 wrong passcodes   created_by uuid references profiles, created_at timestamptz default now(),   constraint shop_needs_outlet check (role <> 'shop_user' or outlet_id is not null));  create table categories (   id uuid primary key default gen_random_uuid(),   name text unique not null, active boolean default true);  -- DESIGNS create table designs (   id uuid primary key default gen_random_uuid(),   sku text unique not null,   barcode text unique not null,   category_id uuid not null references categories,   mrp numeric(12,2) not null check (mrp > 0),   -- no qty column: each design row is one physical piece   title text, notes text,   origin_outlet_id uuid not null references outlets,   -- where it was first uploaded   current_outlet_id uuid not null references outlets,  -- where it physically is now   location_since timestamptz not null default now(),   -- drives the AGE tag   status design_status not null default 'available',   media_flag boolean not null default false,           -- true = HO asked for image correction   unclear_votes int not null default 0,                -- open "image not clear" votes   sold_at timestamptz, sold_by uuid references profiles,   sold_invoice_no text, sold_invoice_path text,        -- invoice is mandatory to mark sold   sold_amount numeric(12,2),                           -- optional actual sale value   deleted_at timestamptz, deleted_by uuid references profiles, delete_reason text,   created_by uuid not null references profiles,   created_at timestamptz default now(), updated_at timestamptz default now(),   constraint sold_needs_invoice check (status <> 'sold'     or (sold_invoice_no is not null and sold_invoice_path is not null))); create index on designs (current_outlet_id, status); create index on designs (category_id); create index on designs (mrp);  -- MEDIA (keep old versions; only one current per kind) create table design_media (   id uuid primary key default gen_random_uuid(),   design_id uuid not null references designs,   kind media_kind not null,   storage_path text not null, mime text, bytes int, width int, height int,   is_current boolean not null default true,   uploaded_by uuid references profiles, created_at timestamptz default now()); create unique index one_current_media on design_media (design_id, kind) where is_current;  -- HOLDS create table holds (   id uuid primary key default gen_random_uuid(),   design_id uuid not null references designs,   outlet_id uuid not null references outlets,   reason text not null check (length(reason) >= 5),   doc_path text not null,                       -- mandatory supporting document   days int not null check (days between 1 and 30),  -- chosen by the shop   expires_at timestamptz not null,              -- held_at + days; auto-released by pg_cron   hold_no int not null,                         -- 1st, 2nd, 3rd... hold of this design at this outlet   source text not null default 'manual' check (source in ('manual','rejection')),   transfer_id uuid,                             -- the rejected request (FK added below)   held_by uuid not null references profiles, held_at timestamptz default now(),   released_at timestamptz, released_by uuid references profiles, release_note text); create unique index one_active_hold on holds (design_id) where released_at is null;  -- TRANSFERS create table transfers (   id uuid primary key default gen_random_uuid(),   design_id uuid not null references designs,   from_outlet_id uuid not null references outlets,   -- owner at request time   to_outlet_id uuid not null references outlets,     -- requester   status transfer_status not null default 'requested',   request_note text,   requested_by uuid not null references profiles, requested_at timestamptz default now(),   decided_by uuid references profiles, decided_at timestamptz,   reject_reason text, reject_doc_path text,   sent_to_ho_by uuid references profiles, sent_to_ho_at timestamptz,   ho_received_by uuid references profiles, ho_received_at timestamptz,   ho_dispatched_by uuid references profiles, ho_dispatched_at timestamptz, ho_note text,   prev_location_since timestamptz,   -- saved at accept; restored on return to origin (age continues)   reject_hold_days int check (reject_hold_days between 1 and 30),   received_by uuid references profiles, received_at timestamptz,   constraint reject_needs_reason check (status <> 'rejected'     or (reject_reason is not null and reject_doc_path is not null         and reject_hold_days is not null))); create unique index one_open_transfer on transfers (design_id)   where status not in ('rejected','cancelled','completed','returned'); alter table holds add foreign key (transfer_id) references transfers;  -- hourly auto-release of expired holds (pg_cron extension) select cron.schedule('release-expired-holds', '5 * * * *', $$select release_expired_holds()$$);  -- IMAGE CORRECTION REQUESTS (HO → shop) create table image_corrections (   id uuid primary key default gen_random_uuid(),   design_id uuid not null references designs,   kinds media_kind[] not null, note text not null,   requested_by uuid not null references profiles, requested_at timestamptz default now(),   resolved_by uuid references profiles, resolved_at timestamptz);  -- IMAGE NOT CLEAR VOTES (any user outside the owner outlet; one open vote per user per design) create table image_votes (   id uuid primary key default gen_random_uuid(),   design_id uuid not null references designs,   voter_id uuid not null references profiles,   voter_outlet_id uuid references outlets,   kinds media_kind[],              -- which images are unclear (optional)   note text,   created_at timestamptz default now(),   resolved_at timestamptz, resolved_by uuid references profiles);  -- set when owner re-uploads create unique index one_open_vote on image_votes (design_id, voter_id) where resolved_at is null;  -- LOCATION HISTORY (one row per stay; used by the age report) create table design_locations (   id bigserial primary key,   design_id uuid not null references designs,   outlet_id uuid not null references outlets,   arrived_at timestamptz not null, left_at timestamptz);  -- AUDIT / EVENT LOG (append-only, source for every report) create table design_events (   id bigserial primary key,   design_id uuid references designs,   transfer_id uuid references transfers,   event text not null,       -- 'created','edited','sold','unsold','hold','hold_released',                              -- 'requested','accepted','rejected','sent_to_ho','ho_received',                              -- 'forwarded','returned_to_origin','received','relocated',                              -- 'image_correction_requested','image_corrected','image_voted_unclear',                              -- 'image_votes_resolved','deleted'   outlet_id uuid references outlets, actor_id uuid references profiles,   data jsonb default '{}', created_at timestamptz default now()); create index on design_events (event, created_at);  -- LIST VIEW used by every grid (age computed, deleted hidden) create view designs_v with (security_invoker = true) as select d.*,   floor(extract(epoch from now() - d.location_since)/86400)::int as age_days,   o.name as outlet_name, c.name as category_name,   h.hold_no, h.expires_at as hold_expires_at,   (select storage_path from design_media m      where m.design_id = d.id and m.kind = 'thumbnail' and m.is_current) as thumb_path from designs d join outlets o on o.id = d.current_outlet_id join categories c on c.id = d.category_id left join holds h on h.design_id = d.id and h.released_at is null where d.deleted_at is null;
RPC functions to generate in migration 0002_rpc.sql (each security definer, checks role and current status, updates rows, writes design_events):
Function
Who
Allowed from → to
create_design(payload)
shop, HO
validates all 8 media kinds present, MRP > 0 → available
update_design(id, fields)
owner shop, HO
not when in_transfer; MRP change needs double entry in UI
mark_sold(id, invoice_no, invoice_path, amount) / unmark_sold(id)
owner shop, HO
available/on_hold → sold; sold → available (owner shop, any time; logged). Refused without invoice number + uploaded invoice file
place_hold(id, days, reason, doc_path)
owner shop, HO
available → on_hold
release_hold(id, note)
owner shop, HO
on_hold → available
request_transfer(id, note)
shop (not owner)
available → requested
cancel_request(transfer_id)
requester
requested → back to available
decide_transfer(transfer_id, accept, reason, doc_path, hold_days)
owner shop
accept → in_transfer; reject → design on_hold, reason + doc + 1–30 hold days required; places a numbered hold
send_to_ho(transfer_id)
owner shop
transfer accepted → sent_to_ho
ho_receive(transfer_id)
HO
sent_to_ho → received_at_ho; design current_outlet_id = HO
ho_dispatch(transfer_id, 'requester' or 'origin', note)
HO
→ dispatched_to_requester / dispatched_to_origin
receive_transfer(transfer_id)
receiving shop
→ completed / returned; design available, outlet changed, location_since = now() when completed; restores prev_location_since when returned (age continues)
ho_relocate(id, outlet_id, reason)
HO
any non-sold → new outlet, age resets
soft_delete_design(id, reason)
HO, admin
any → deleted
request_image_correction(id, kinds, note) / resolve_image_correction(id)
HO / owner shop
sets / clears media_flag
vote_image_unclear(id, kinds, note)
any shop user not in the owner outlet; HO
one open vote per user per design; increments unclear_votes, notifies owner outlet, writes event
withdraw_vote(id)
the voter
closes own open vote, decrements unclear_votes
resolve_image_votes(id)
owner shop, HO
allowed only after at least one image is replaced; closes all open votes, unclear_votes = 0
Security, auth and storage
The rule is simple: the browser only ever holds the anon key, reads through RLS, and changes state only through RPC functions or Edge Functions that check the caller's role.
Auth and user creation
	•	No public sign-up: disable it in Supabase Auth settings.
	•	Edge Function admin-create-user (uses service_role, server-side only): checks caller is super_admin, calls auth.admin.createUser with a generated temp 6-digit passcode, inserts profiles with must_change_password = true, returns the temp passcode once for the admin to share.
	•	Edge Function login-by-username: looks up email by username, signs in, returns the session. Accepts exactly 6 digits. Rate-limit by IP (10 tries / 10 min) and lock the account for 15 minutes after 5 wrong passcodes (failed_logins, locked_until); Super Admin can unlock.
	•	Edge Function admin-reset-password: new temp 6-digit passcode, sets must_change_password = true.
	•	Route guard: if must_change_password is true, every route redirects to Change passcode until done.
	•	Profile page: user can edit phone, address, email (re-verify) and passcode at any time (current passcode required); username and role only by admin.
Passcode rules (all roles)
	•	Exactly 6 digits, 0–9. It is stored as the Supabase Auth password (hashed); set the Auth minimum password length to 6.
	•	Reject weak codes: 000000, 123456, 654321, all-same digits, straight sequences, and the last 6 digits of the user's phone.
	•	Login screen: username, then six single-digit boxes with a numeric keypad (inputmode="numeric"), paste supported, auto-submit on the 6th digit, show/hide toggle.
	•	5 wrong passcodes lock the account for 15 minutes; Super Admin can unlock or reset it from Users.
RLS policies (summary)
Table
Select
Insert / Update / Delete
outlets, categories
all signed-in, active users
admin (categories: HO too)
profiles
own row; HO and admin see all
Edge Functions only; user updates own phone/address
designs
all signed-in users, deleted_at is null (HO/admin also see deleted)
RPC only — no direct table writes from client
design_media
all signed-in users
insert by owner outlet or HO; is_current flips via RPC
holds, transfers, image_corrections
all signed-in users
RPC only
design_events
own outlet's designs; HO/admin all
trigger/RPC only, never update or delete
Helper functions to create first: auth_role(), auth_outlet() reading from profiles for auth.uid().
Storage buckets
Bucket
Content
Path pattern
Access
design-media
images + videos
{design_id}/{kind}/{uuid}.webp or .mp4
read: signed-in; write: owner outlet or HO
documents
hold docs, rejection docs, sale invoices
{holds, rejections or invoices}/{id}/{file}
read: involved outlets + HO; write: uploader
Use signed URLs (1 hour) for display, and Supabase image transformations (width=400) for grid thumbnails so lists stay fast. Limits: images 8 MB before compression, video 50 MB / 30 s, documents (holds, rejections, invoices) any common file type such as PDF, photo, Word or Excel, up to 10 MB.
Upload flow: media, crop and barcode
The upload screen is a 4-step wizard that cannot be submitted until all 8 media slots are filled, MRP matches, and SKU and barcode are confirmed unique.
	•	Identify
	•	SKU: text field, uppercase, live uniqueness check (debounced RPC sku_exists).
	•	Barcode: two buttons, Scan with camera (opens full-screen ZXing scanner, rear camera, torch toggle, beep + vibrate on read) and Type manually. After a scan, show the value for the user to confirm. Live uniqueness check.
	•	Category: dropdown from categories.
	•	Price
	•	MRP and Confirm MRP as two separate fields; paste disabled on the confirm field; red error until they match exactly. Format ₹ with 2 decimals.
	•	Media (8 slots in a grid, each shows status: empty, cropping, uploading %, done)
	•	Thumbnail (crop 1:1), Front, Angle 1, Angle 2, Angle 3 (crop 1:1), Barcode front, Barcode back (free crop), Video.
	•	Each image slot: take photo (capture="environment") or pick from gallery → crop dialog (zoom, rotate 90°, aspect lock) → compress to WebP, max 2000 px long edge, ~85% quality.
	•	Quality gate before accepting a photo: reject if shorter edge < 1000 px; warn if image looks blurry (Laplacian variance check on a 512 px canvas copy — a small helper the agent can write).
	•	Video: max 30 s / 50 MB, MP4 or MOV, show preview and duration; reject longer files.
	•	Upload each file to Storage as soon as it's cropped (resumable for video using TUS), so the final submit is instant.
	•	Review and submit
	•	Summary card with all images, SKU, barcode, MRP, category. Submit calls create_design, which re-checks everything server-side.
Editing later (My Designs → Edit): same fields, MRP change again needs double entry, each media slot can be replaced (old version kept, is_current = false). Editing is blocked while the design is requested or in_transfer.
Image correction loop: HO picks the bad slots and writes a note → design shows a red Fix images badge for the owner outlet and appears in their Notifications → owner replaces those slots → resolve_image_correction clears the flag.
Image not clear votes (peer quality check from other outlets)
	•	On any design from another outlet, a shop user taps Image not clear, optionally ticks which images (front, angle 2, barcode back…) and adds a note. One open vote per user per design; they can withdraw it.
	•	The owner outlet immediately sees an amber Images unclear · n votes badge on the tile, a notification, and the design listed under My Designs → Fix images.
	•	The owner opens Edit, replaces the flagged images (same crop, compress and quality gate), and saves; this calls resolve_image_votes, which closes every open vote.
	•	Head Office and Admin see all votes, open and resolved, in the Image clarity votes report, and can escalate a design with many votes into a formal image-correction request.
Brand and UI design: SWA Diamonds gallery
The app should feel like a jewellery showroom catalogue a salesperson can hand to a customer: white space, SWA teal accents, large product photos, and no dark tones anywhere.
Colour palette (white + teal only; the teal values are read from the logo, so confirm the exact hex from the logo's source file)
Token
Value
Use
teal-600 primary
#00737D
Logo, primary buttons, active tab, links, focus ring
teal-700 deep
#005A62
Button hover and pressed, page headings
teal-800 text
#0E4B52
Body text (teal-tinted, never black)
teal-100 soft
#E6F3F4
Selected chips, badges, tile hover
teal-50 mist
#F4FAFA
Section bands, skeleton loaders, filter panel
line
#D5E8EA
Borders and dividers
white
#FFFFFF
Page, cards, modals, image lightbox
Status tints
Hold: #FFF4E0 bg / #8A5A00 text · Error/reject: #FDECEC / #A12B2B · Sold: #EEF1F2 / #4A6366
Small badges only, always on a light tint
Hard rules for the agent
	•	Light theme only: set color-scheme: light, no dark: Tailwind classes, ignore the phone's dark mode.
	•	No black or dark backgrounds anywhere, including the photo lightbox, video player, camera scanner frame and modals (use white with a 90% white overlay, never a dark scrim).
	•	Teal #00737D on white has a contrast of about 5.6:1, so it is safe for text and buttons (WCAG AA).
	•	One accent only: teal. Status tints are small and soft and never replace teal for actions.
Typography (matched to the logo's elegant serif and wide-spaced "DIAMONDS")
	•	Headings and design titles: Cormorant Garamond 600 (Google Fonts).
	•	Interface, labels and numbers: Jost 400/500; uppercase labels with 0.12em letter spacing, like the logo's "DIAMONDS".
	•	Prices use tabular numerals and the ₹ sign, e.g. ₹ 1,24,500 (Indian digit grouping).
Logo usage
	•	Request the logo as SVG (sharp on every screen); keep the JPG only as a fallback. Store it in /public/brand/.
	•	Login and change-passcode screens: large centred logo on white, passcode boxes below.
	•	Header: logo on the left on tablet and desktop, centred on mobile; minimum 28 px tall.
	•	Favicon and PWA icon: the "SW" monogram in teal on white; splash screen: full logo on white.
	•	Customer Showcase: small, faint logo watermark in the corner.
Gallery views (a view switcher on All Designs, My Designs and HO views)
View
Who it's for
What it shows
Grid (1, 2, 3 or 4 per row)
Staff browsing
Square 1:1 photo tiles; small SKU, MRP, outlet, age and status below
List
Staff, quick checks
Compact rows: thumbnail, SKU, category, MRP, outlet, age, status
Lookbook
Staff and customer
One design per screen; swipe left/right between designs, swipe up for all angles and the video
Customer Showcase
Shown to the customer
Full-screen, photos only with category and (optional) MRP; all internal info hidden (outlet, age, holds, votes, SKU); white background; leaving it needs the 6-digit passcode
Slideshow
Counter tablet display
Auto-plays the filtered designs every 4 s with a soft fade; tap to pause
Compare
Customer choosing
2–4 picked designs side by side with synced zoom
	•	Shortlist: while talking to a customer, staff tap a heart on any tile to build a session shortlist, then open it in Showcase or Compare. Shortlists stay in the app; nothing is shared outside.
	•	Design detail: large 1:1 hero photo with swipe and pinch zoom, a thumbnail strip (front, 3 angles, video, barcode front/back), a white lightbox, and a Show to customer button that opens Showcase at that design.
Responsive layout
Screen width
Device
Navigation
Default tiles
Filters
Under 640 px
Phone
Bottom tab bar (5 items) + floating teal Upload button
2
Bottom sheet
640–1023 px
Tablet, portrait or landscape
Icon rail on the left that expands to labels
3
Side sheet
1024 px and up
Laptop/desktop
Left sidebar with labels
4
Fixed side panel
	•	Touch targets at least 44 px; sticky search, filter and view bar; respect iPhone safe areas (notch, home bar).
	•	Showcase and Slideshow are designed landscape-first for tablets and work in portrait on phones.
	•	Test every screen at 375, 768, 1024 and 1280 px.
Polish and speed
	•	Photos fade in over a blurred placeholder; skeleton loaders in teal mist; 150–200 ms transitions; a short vibration on a successful barcode scan.
	•	Supabase image transforms serve 400, 800 and 1600 px sizes (srcset); long grids are virtualised; Showcase preloads the next design.
	•	Empty states use simple teal line illustrations with one clear action ("Upload your first design").
	•	Target a Lighthouse mobile score of 90+ for performance and accessibility.
Screens and UI
One app, one layout: a bottom tab bar on mobile and a left sidebar on tablet/desktop, with menu items filtered by role.
Shared: the design grid (used by All Designs, My Designs, HO views)
	•	Tile-density switch: 1 / 2 / 3 / 4 per row, remembered per user in localStorage. Defaults: mobile 2, tablet 3, desktop 4; on phones under 400 px the 3 and 4 options collapse to 2.
	•	Each tile: thumbnail, SKU, MRP, category, outlet name, age tag (colour by band: green 0–30 d, amber 31–90 d, red 90+ d — bands set by admin), status badge (Sold, On hold #n · x days left, Requested, In transfer, Fix images, Images unclear · n votes).
	•	Section order in All Designs: available designs first, then In transfer as its own group, then Sold as the last group.
	•	Infinite scroll, 40 per page, skeleton loaders. Tap a tile → detail page with image gallery (swipe, pinch zoom), video player, barcode images, full history timeline from design_events.
	•	Filter bar (sheet on mobile, sidebar on desktop): search (SKU / barcode, also by camera scan), MRP min–max slider + inputs, category multi-select, outlet multi-select, status (available, sold, unsold, on hold, requested, in transfer), age range, date uploaded. Sort: newest, oldest, MRP low–high, MRP high–low, age. Filters live in the URL so views can be shared and bookmarked.
Shop User
Screen
What it does
All Designs
Every outlet's designs with the grid above; Image not clear vote button on other outlets' designs; Request button on tiles from other outlets when status is available
My Designs
Own outlet only; actions: Edit, Mark sold (invoice number + invoice photo/PDF required), Put on hold (1–30 days, reason + doc required; shows Hold #n), Release hold, Fix images (shown when votes or an HO correction are open). No delete button anywhere
Upload
The 4-step wizard
Requests → Incoming
Requests for my designs: Accept, or Reject with reason + mandatory document + hold days (1–30), which puts the design on a numbered hold; after accept, Send to Head Office
Requests → Outgoing
My requests and their live status; Cancel while still requested; Mark received when HO has dispatched to me
Notifications
Request received, accepted, rejected, dispatched, image correction needed, image-not-clear vote received, hold expiring in 1 day (bell icon with count; Supabase Realtime)
Profile
Edit contact, address, email, 6-digit passcode
Head Office
Screen
What it does
Dashboard
Counts: total designs, in transfer, at HO now, on hold (with hold counts: designs on their 2nd, 3rd+ hold, by outlet), sold this month, open image corrections, designs with unclear-image votes; aging buckets
All Designs
Same grid + extra actions: Change location, Request image correction, Delete (reason required), Override hold/request
Transfers inbox
Tabs: Sent to HO (mark received), At HO (forward to requester or return to origin), In transit to outlets
Image corrections
Open and resolved requests, plus every design with image-not-clear votes
Reports
See Reports section
Super Admin
Everything Head Office has, plus: Users (create any role, disable, reset temp passcode, unlock locked accounts), Outlets, Categories, Age-band settings, full Audit log, deleted-designs view with restore.
Reports
Every report is a Postgres view or RPC over designs, transfers, holds and design_events, with date-range, outlet and category filters, and Excel/CSV export.
Report
Shows
Key filters
Age report
Each unsold design with days at current outlet; buckets 0–30 / 31–60 / 61–90 / 90+; avg age per outlet
Outlet, category, MRP, age range
Hold report
Active and past holds with hold number (#1, #2…), days chosen, expiry, manual or from rejection; repeat-hold ranking by design and outlet; design, outlet, reason, held by, days on hold, document link
Outlet, active/released, date
Rejection report
Every rejected request: design, owner outlet, requester, reason, document
Outlet, date, reason text
Most rejected
Designs and outlets ranked by rejection count and rejection rate
Date range, top N
Transfer report
All transfers with each stage timestamp and total days; HO turnaround time
Status, from/to outlet, date
Transfer ranking
Outlets ranked by transfers sent, received, completed; most-transferred designs
Date range
Sold report
Sold designs with invoice number and invoice link, MRP total, sale amount, count by outlet and category; days from upload to sale
Date range, outlet, category
Sold ranking
Outlets and categories ranked by sold count and MRP value; avg age at sale
Date range
Image correction report
Open/resolved requests, time to fix, by outlet
Status, outlet
Image clarity votes (HO + Admin only)
Designs ranked by open votes; who voted, from which outlet, which images, note; votes per owner outlet; days from first vote to fix; repeat offenders
Owner outlet, voter outlet, open/resolved, date, min votes
Stock summary
Current count and MRP value by outlet × category × status
Outlet
User activity
Uploads, sales, transfers per user
User, date
Shop users see a My outlet version of Age, Hold, Sold and Transfer reports only.
Phased build plan with Antigravity prompts
Build in 9 phases, each ending with a working, deployed slice; paste one prompt at a time and do not start the next phase until its checks pass.
Phase
Delivers
Done when
0
Repo, rules, Supabase + Vercel wiring
Empty app deploys to Vercel preview
1
Schema, RLS, helper functions, seed
Migrations apply cleanly; RLS tests pass
2
Auth, user admin, profile
Admin creates user → user logs in → forced passcode change
3
Upload wizard (media, crop, barcode)
A design with 8 media saves from a phone
4
All Designs + My Designs grid, filters, detail
1–4 tile switch works at 375/768/1280 px
5
Sold, hold, edit, age tags
Hold blocks requests; age shows correctly
6
Transfer workflow end to end
Full request → HO → receive cycle; age resets
7
HO tools: relocate, delete, image correction
Correction loop completes
8
Reports + exports
All 11 reports with Excel export
9
Notifications, polish, PWA, go-live
Checklist in next section is green
Phase 0 prompt
Read AGENTS.md and docs/BUILD_PLAN.md. Scaffold a React 18 + Vite + TypeScript app with Tailwind and shadcn/ui, React Router, TanStack Query, React Hook Form + Zod. Create the folder structure from the plan. Add src/lib/supabase.ts using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Add Tailwind theme tokens from the "Brand and UI design" section (teal-50..800, line, status tints), Cormorant Garamond + Jost fonts, color-scheme: light, and no dark mode. Add the SWA logo from /public/brand. Responsive AppShell: bottom tab bar < 640px, icon rail 640-1023px, labelled sidebar >= 1024px. Add vercel.json with SPA rewrites. Produce a Plan artifact first and wait for my approval.
Phase 1 prompt
Create supabase/migrations/0001_core.sql exactly from the "Supabase data model" section, then 0002_rls.sql with helper functions auth_role() and auth_outlet() and the RLS policies from the "Security" section (designs/holds/transfers have NO direct write policies for clients). Create storage buckets design-media and documents with the listed policies. Add seed.sql: 1 head office outlet, 3 shop outlets, 5 categories. Generate TypeScript types into src/lib/database.types.ts. Write SQL tests (pgTAP or plain scripts) proving a shop_user cannot update another outlet's design or delete any design.
Phase 2 prompt
Build auth with a 6-digit numeric passcode for all roles (stored as the Supabase Auth password; set Auth minimum password length to 6). Edge Functions admin-create-user, admin-reset-password and login-by-username as described in the plan (service_role only inside functions). login-by-username accepts exactly 6 digits, counts failed_logins and sets locked_until for 15 min after 5 wrong tries. Login page: username + 6-box numeric passcode input (inputmode=numeric, paste, auto-submit on the 6th digit). Reject weak passcodes (000000, 123456, repeated or sequential digits). Route guard: redirect to /change-passcode while profiles.must_change_password is true. Role-based route trees for super_admin, head_office, shop_user. Admin Users page: list, create (name, username, email, phone, address, role, outlet), disable, unlock, reset passcode; show the temp passcode once in a copyable dialog. Profile page to edit phone, address, email and passcode (current passcode required).
Phase 3 prompt
Build the Upload wizard (4 steps) from the "Upload flow" section. Components: BarcodeScanner (@zxing/browser, rear camera, torch, confirm dialog) with manual entry fallback; MediaSlot with react-easy-crop dialog, rotate, aspect presets, browser-image-compression to WebP 2000px; min 1000px edge check and blur warning; VideoSlot with 30s/50MB limit and TUS resumable upload. MRP + Confirm MRP must match (paste disabled on confirm). Live uniqueness checks for SKU and barcode. Submit calls RPC create_design which re-validates all 8 media kinds server-side. Test on a 375px viewport.
Phase 4 prompt
Build DesignGrid with a 1/2/3/4 tiles-per-row switch (saved in localStorage, responsive defaults 2/3/4). Tile: thumbnail via signed URL with width=400 transform, SKU, MRP (INR), category, outlet, age tag coloured by bands, status badge. All Designs groups: available, then "In transfer", then "Sold" last. FilterPanel (sheet on mobile): SKU/barcode search incl. camera scan, MRP range, category, outlet, status, age range, upload date, sort options. Store filters in URL search params. Infinite scroll via designs_v. Detail page with gallery, video, barcode images and history timeline from design_events. Add the gallery view switcher from "Brand and UI design": Grid, List, Lookbook, Customer Showcase (internal data hidden, passcode to exit), Slideshow and Compare, plus a session Shortlist. White lightbox only; blur-up images; virtualised grid.
Phase 5 prompt
Add My Designs (own outlet). Actions via RPC: update_design (MRP change needs double entry), mark_sold (dialog: invoice number + invoice photo/PDF uploaded to documents/invoices, optional sale amount; RPC refuses without invoice), unmark_sold, place_hold (1–30 days, hold number per design + outlet, reason + document upload to documents bucket, both required), release_hold, plus release_expired_holds() run hourly by pg_cron. There must be no delete action for shop users anywhere in the UI. Show hold reason on the tile tooltip/detail.
Phase 6 prompt
Implement the transfer workflow from the "Product lifecycle" section as security-definer RPCs with strict from→to checks and design_events rows: request_transfer, cancel_request, decide_transfer (reject needs reason + document + 1–30 hold days and places a numbered hold), send_to_ho, ho_receive, ho_dispatch (requester|origin), receive_transfer (sets current_outlet_id, location_since = now() on completed, restores prev_location_since on returned, closes design_locations row, opens new). UI: Request button on All Designs; Requests page with Incoming/Outgoing tabs; HO Transfers inbox with tabs Sent to HO / At HO / In transit. Write tests for every illegal transition (e.g. requesting a held or sold design must fail).
Phase 7 prompt
Head Office tools: ho_relocate (reason required, resets age), soft_delete_design (reason required, hidden from shops, admin can restore), request_image_correction (pick media slots + note) and the owner-side Fix images flow that replaces slots and calls resolve_image_correction. Add the Image not clear vote: button on other outlets' designs (pick images + note), RPCs vote_image_unclear / withdraw_vote / resolve_image_votes, amber badge + notification for the owner outlet, Fix images list in My Designs; replacing an image resolves all open votes. Build the Image clarity votes report for HO/admin. HO dashboard with the counts listed in the plan.
Phase 8 prompt
Build the Reports area with every report in the "Reports" table as SQL views or RPCs (security_invoker), a shared ReportTable (TanStack Table, sort, column picker), date/outlet/category filters, Recharts for rankings, and Excel + CSV export via SheetJS. Shop users see only their outlet versions.
Phase 9 prompt
Add a notifications table + Supabase Realtime bell for request, accept, reject, dispatch and image-correction events. Make the app an installable PWA (manifest, icons, offline shell). Run an accessibility and responsive pass at 375/768/1280px, add error boundaries and toasts, and produce a Walkthrough artifact covering every role's main flows.
Testing, deployment and go-live
Use two Supabase projects (staging, production) mapped to Vercel Preview and Production environments, and never run untested migrations on production.
Environments
	•	Vercel env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY per environment. The service_role key lives only in Supabase Edge Function secrets.
	•	Migrations through Supabase CLI (supabase db push) from the repo; GitHub Action applies to staging on merge to develop, production on tag.
	•	Daily database backups (Supabase Pro plan) and storage bucket backup plan.
Go-live checklist
	•	☐ Public sign-up disabled; 5 wrong passcodes lock the account; weak passcodes rejected; every table shows RLS enabled
	•	☐ Shop user cannot: delete a design, edit another outlet's design, request a held/sold/in-transfer design, vote on its own outlet's images (tested)
	•	☐ Reject without reason or document fails at the database level
	•	☐ MRP mismatch blocks submit; duplicate SKU/barcode blocked; mark sold without invoice is refused
	•	☐ Barcode camera scan works on Android Chrome and iPhone Safari (HTTPS required)
	•	☐ Crop + compress keeps upload under ~600 KB per image on a phone
	•	☐ Full transfer cycle tested for both HO choices (forward, return to origin); age resets on receipt by the requester and continues on return to origin; holds auto-release at expiry and hold numbers count up
	•	☐ Grid 1/2/3/4 tiles checked at 375, 768, 1024, 1280 px
	•	☐ All reports export to Excel with correct totals against a hand-checked sample
	•	☐ Admin created real users for every outlet; temp passcodes shared privately
	•	☐ Error logging connected (Sentry or Vercel logs) and a backup restore tested once
Decisions
All answered on 26 Oct 2026; the sections above already reflect these decisions.
Question
Decision
Quantity per design
No qty field; each design is one piece
Requests on one design
One open request at a time
Age after return to origin
Continues from the original arrival date (no reset)
Reversing a sale
Shop user can unmark sold, any time
MRP edits after upload
Shop user can edit (double entry)
Who creates users
Super Admin only
Hold length and count
1–30 days chosen when holding or rejecting; auto-release at expiry; each hold numbered #1, #2, #3… per design per outlet; hold counts on HO and Admin dashboards; reason + document every time
Image crop ratio
1:1 for thumbnail and angle images
Alerts
In-app notifications only
Volume
Low; one Supabase Pro project per environment is enough
Image not clear votes
Indicator only; nothing forced or blocked
Invoice file
Any document: PDF, photo or other file
Login method
Username + simple 6-digit numeric passcode for all roles; locks for 15 min after 5 wrong tries
Look and feel
SWA Diamonds branding; white + teal only, no dark tones; gallery-style views for showing customers; fully mobile and tablet responsive

