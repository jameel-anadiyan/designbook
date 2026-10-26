# Design Book · SWA Diamonds

Private multi-outlet design catalogue. Shops upload each physical piece (SKU, barcode, MRP, 8 media), see every
outlet's stock, and move pieces between outlets through Head Office with a full audit trail.

**Stack:** React 19 + Vite + TypeScript · Tailwind v4 · TanStack Query · React Hook Form + Zod ·
Supabase (Auth, Postgres + RLS, Storage, Edge Functions, pg_cron, Realtime) · Vercel.

Feature source of truth: [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md). Agent rules: [`AGENTS.md`](AGENTS.md), `.agents/rules/`.

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Scaffold, SWA design system, responsive shell | ✅ |
| 1 | Schema, RLS, all workflow RPCs, storage, seed, SQL tests (76 passing) | ✅ |
| 2 | Passcode auth, lockout, forced change, admin users, profile, outlets, categories | ✅ |
| 3–9 | Upload wizard, grid & gallery views, holds/sold UI, transfers UI, HO tools, reports, PWA | ⏳ |

## Run locally

```bash
npm install
cp .env.example .env.local   # publishable key only
npm run dev                  # http://localhost:5173
```

## Database & functions

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...      # never commit
npx supabase link --project-ref jociqgerdqqxjnrenuqm
npm run db:push        # apply migrations
npm run db:test        # RLS + workflow tests (rolled back, leaves no data)
npm run db:types       # regenerate src/lib/database.types.ts
npm run fn:deploy      # deploy Edge Functions
npm run e2e:auth       # ADMIN_CODE=xxxxxx — API-level auth E2E (throwaway users)
```

First Super Admin (public sign-up is disabled):
`npm run bootstrap:admin -- <username> <email> <phone> "<Full Name>"`

## Security model

- Browser holds only the publishable key. Every table has RLS.
- Clients never write workflow tables — all state changes are `security definer` RPCs that check role +
  status, write `design_events` and send notifications.
- Login = username + 6-digit passcode via `login-by-username` (IP rate limit, 15-min lock after 5 wrong).
  Weak passcodes are rejected server-side.

## Deploy (Vercel)

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` per environment. `vercel.json` handles SPA rewrites,
asset caching and security headers.
