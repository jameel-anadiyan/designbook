# Stack rules

- React 19 + Vite + TypeScript (strict). Path alias `@/` → `src/`.
- Tailwind CSS v4 via `@tailwindcss/vite`; theme tokens live in `src/index.css` under `@theme`.
- UI primitives: own shadcn/ui-style components in `src/components/ui` (CVA + tailwind-merge). Do not add
  other UI kits (MUI, Chakra, Ant, Bootstrap…).
- Routing: `react-router` (v7, library mode — v6-compatible API).
- Server state: TanStack Query. No ad-hoc `useEffect` fetching.
- Forms: React Hook Form + Zod.
- Toasts: `sonner`. Icons: `lucide-react`.
- Media: react-easy-crop, browser-image-compression, @zxing/browser, tus-js-client.
- Gallery: embla-carousel-react, yet-another-react-lightbox (white), @tanstack/react-virtual.
- Reports: @tanstack/react-table, recharts, xlsx (SheetJS).
- Supabase client: `src/lib/supabase.ts` only, using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
