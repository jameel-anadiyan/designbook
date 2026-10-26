#!/usr/bin/env node
// Runs supabase/tests/*.sql against the linked project via the Management API.
// Each test file ends by raising 'TEST_REPORT…' so the transaction is rolled back.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/db-test.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF ?? 'jociqgerdqqxjnrenuqm';
if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN');
  process.exit(2);
}

const dir = 'supabase/tests';
let failed = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  const sql = readFileSync(join(dir, file), 'utf8');
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  const idx = text.indexOf('TEST_REPORT');
  console.log(`\n▶ ${file}`);
  if (idx === -1) {
    console.log('  Test file did not produce a report:\n', text.slice(0, 2000));
    failed++;
    continue;
  }
  const report = JSON.parse(`"${text.slice(idx + 'TEST_REPORT'.length).split(/(?<!\\)"/)[0]}"`)
    .split('\n')
    .filter(Boolean);
  for (const line of report) console.log('  ' + line);
  const bad = report.filter((l) => l.startsWith('FAIL')).length;
  console.log(`  → ${report.length - bad} passed, ${bad} failed`);
  failed += bad;
}
process.exit(failed ? 1 : 0);
