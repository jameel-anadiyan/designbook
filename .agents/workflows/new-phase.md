---
description: Start a new build phase
---
1. Read `AGENTS.md` and the phase section in `docs/BUILD_PLAN.md`.
2. Produce a Plan artifact and wait for approval.
3. If the phase changes the database, follow `/db-change`.
4. Build the UI against the generated types.
5. Run `npm run build`, `npm run lint` and SQL tests.
6. Produce a Walkthrough artifact with screenshots at 375 px and 1280 px.
