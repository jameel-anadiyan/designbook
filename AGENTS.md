# Design Book

Private multi-outlet design catalogue for **SWA Diamonds**. Roles: `super_admin`, `head_office`, `shop_user`.

Stack: React + Vite + TS, Tailwind v4, shadcn/ui-style primitives (src/components/ui), TanStack Query,
RHF + Zod, Supabase (Auth, Postgres, Storage, Edge Functions, RLS), Vercel.

Source of truth for features: `docs/BUILD_PLAN.md`. Build one phase at a time.

**Never:**
- use the Supabase service_role key in frontend code;
- hard-delete designs;
- let a shop_user change status outside the allowed transitions (enforced in SQL).

All status changes go through Postgres RPC functions, never direct UPDATEs.
Every table has RLS enabled. Every mutation writes a row to `design_events`.

Brand: SWA Diamonds. White + teal (`#00737D`) only, light theme only, no dark backgrounds or dark mode
anywhere. Fonts: Cormorant Garamond + Jost. Logo in `/public/brand`.

Mobile-first: test every screen at 375px, 768px, 1024px, 1280px.

## Glossary
- **Outlet**: a shop. Head Office is also an outlet row (`is_head_office = true`).
- **Design**: one physical piece (no quantity). Unique SKU + barcode.
- **Age**: days since `location_since` at the current outlet.
- **Hold**: owner reserves a design for 1–30 days, numbered #1, #2… per design per outlet.
- **Transfer**: request → accept/reject → sent to HO → HO receives → forward/return → receive.
