#!/usr/bin/env node
// One-time: create the first Super Admin (public sign-up is disabled).
// The service key is fetched at runtime via the Supabase CLI and never written to disk.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/bootstrap-admin.mjs <username> <email> <phone> "<Full Name>"
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { generatePasscode } from './passcode.mjs';

const REF = process.env.SUPABASE_PROJECT_REF ?? 'jociqgerdqqxjnrenuqm';
const [username = 'superadmin', email = 'admin@swadiamonds.in', phone = '9999999999', fullName = 'Super Admin'] =
  process.argv.slice(2);

const keys = JSON.parse(execSync(`npx supabase projects api-keys --project-ref ${REF} -o json`, { encoding: 'utf8' }));
const secret = keys.find((k) => k.type === 'secret')?.api_key ?? keys.find((k) => k.name === 'service_role')?.api_key;
if (!secret || secret.includes('·')) {
  // new secret keys are masked in list output — fall back to the legacy service_role JWT
  const legacy = keys.find((k) => k.name === 'service_role')?.api_key;
  if (!legacy) throw new Error('Could not obtain a service key');
  run(legacy);
} else run(secret);

async function run(key) {
  const sb = createClient(`https://${REF}.supabase.co`, key, { auth: { persistSession: false } });
  const { data: ho } = await sb.from('outlets').select('id').eq('is_head_office', true).single();
  const temp = generatePasscode(phone);
  const { data, error } = await sb.auth.admin.createUser({
    email, password: temp, email_confirm: true, app_metadata: { role: 'super_admin' },
  });
  if (error) throw error;
  const { error: pErr } = await sb.from('profiles').insert({
    id: data.user.id, username, full_name: fullName, email, phone,
    role: 'super_admin', outlet_id: ho.id, must_change_password: true,
  });
  if (pErr) { await sb.auth.admin.deleteUser(data.user.id); throw pErr; }
  console.log(`\n  Super Admin created\n  username : ${username}\n  passcode : ${temp}  (temporary — must be changed at first login)\n`);
}
