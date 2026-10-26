---
description: Make a database change
---
1. Write a new numbered migration in `supabase/migrations/` (never edit an applied one).
2. Apply to staging: `npx supabase db push`.
3. Run SQL tests: `npm run db:test`.
4. Regenerate types: `npm run db:types`.
5. Commit migration + types together.
