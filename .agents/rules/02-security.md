# Security rules

- Every table has `enable row level security`. New table without RLS = bug.
- The browser only holds the anon/publishable key. `service_role` lives only in Edge Function secrets
  and local one-off scripts that are never bundled.
- Clients never write `designs`, `holds`, `transfers`, `image_corrections`, `image_votes`,
  `design_events`, `notifications` directly. All mutations go through `security definer` RPCs that:
  1. check `auth_role()` / `auth_outlet()`;
  2. check the current status (strict from → to);
  3. update rows;
  4. insert a `design_events` row (and notifications when relevant).
- All security-definer functions set `search_path = public` (or `''` with qualified names).
- Profiles are created/modified by Edge Functions only (users may update own phone/address via RPC).
- Public sign-up is disabled. Passcodes: exactly 6 digits; weak codes rejected server-side.
- Storage: `design-media` and `documents` are private buckets; display via signed URLs (1 h).
