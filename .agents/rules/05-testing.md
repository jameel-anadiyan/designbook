# Testing rules

- Every phase ends with: `npm run build` + `npm run lint` clean, SQL tests in `supabase/tests` passing,
  and a Walkthrough artifact with screenshots at 375 px and 1280 px.
- Every illegal status transition must have a SQL test proving it fails.
- Never run untested migrations on production.
