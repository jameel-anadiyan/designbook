// API-level E2E for Phase 2 auth flows against the live project.
// Uses throwaway users (deleted at the end). Does NOT change the superadmin passcode.
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const REF = 'jociqgerdqqxjnrenuqm';
const URL_ = `https://${REF}.supabase.co`;
const PUB = 'sb_publishable_KN_teC9Lg8W8vNpDjqzUNg_EnWbWr-j';
const ADMIN_USER = 'superadmin';
const ADMIN_CODE = process.env.ADMIN_CODE;

const keys = JSON.parse(execSync(`npx supabase projects api-keys --project-ref ${REF} -o json`, { encoding: 'utf8' }));
const service = createClient(URL_, keys.find((k) => k.name === 'service_role').api_key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const ok = (label, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok   ', label, extra); } else { fail++; console.log('  FAIL ', label, extra); }
};
async function fn(name, body, token) {
  const r = await fetch(`${URL_}/functions/v1/${name}`, {
    method: 'POST',
    headers: { apikey: PUB, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
const created = [];

try {
  // 1. admin login
  const a = await fn('login-by-username', { username: ADMIN_USER, passcode: ADMIN_CODE });
  ok('superadmin logs in with temp passcode', a.status === 200 && a.data.session?.access_token);
  ok('login reports must_change_password = true', a.data.must_change_password === true);
  const adminTok = a.data.session.access_token;

  // 2. bad inputs
  const bad = await fn('login-by-username', { username: ADMIN_USER, passcode: '12345' });
  ok('5-digit passcode rejected (400)', bad.status === 400, bad.data.error);

  // 3. create shop user + HO user
  const { data: outs } = await service.from('outlets').select('id, code');
  const out1 = outs.find((o) => o.code === 'OUT1').id;
  const c1 = await fn('admin-create-user', {
    full_name: 'E2E Shop', username: 'e2e.shop', email: 'e2e.shop@test.swa', phone: '9876500001', role: 'shop_user', outlet_id: out1,
  }, adminTok);
  ok('admin creates shop user', c1.status === 200 && /^\d{6}$/.test(c1.data.temp_passcode), `temp=${c1.data.temp_passcode}`);
  if (c1.data.user_id) created.push(c1.data.user_id);
  const shopTemp = c1.data.temp_passcode;

  const dup = await fn('admin-create-user', {
    full_name: 'Dup', username: 'e2e.shop', email: 'x@test.swa', phone: '9876500009', role: 'shop_user', outlet_id: out1,
  }, adminTok);
  ok('duplicate username refused (409)', dup.status === 409, dup.data.error);

  const noOutlet = await fn('admin-create-user', {
    full_name: 'No Outlet', username: 'e2e.none', email: 'none@test.swa', phone: '9876500008', role: 'shop_user',
  }, adminTok);
  ok('shop user without outlet refused', noOutlet.status === 400, noOutlet.data.error);

  // 4. shop user cannot call admin functions
  const s1 = await fn('login-by-username', { username: 'e2e.shop', passcode: shopTemp });
  ok('shop user logs in with temp passcode', s1.status === 200 && s1.data.must_change_password === true);
  const shopTok = s1.data.session.access_token;
  const forbidden = await fn('admin-create-user', { full_name: 'X', username: 'e2e.x', email: 'x2@test.swa', phone: '9876500007', role: 'super_admin' }, shopTok);
  ok('shop user cannot create users (403)', forbidden.status === 403, forbidden.data.error);
  const noAuth = await fn('admin-reset-password', { user_id: created[0] });
  ok('anonymous cannot reset passcodes (401)', noAuth.status === 401);

  // 5. change passcode rules (server-side)
  const weak1 = await fn('change-passcode', { current: shopTemp, next: '123456' }, shopTok);
  ok('weak 123456 rejected server-side', weak1.status === 400, weak1.data.error);
  const weak2 = await fn('change-passcode', { current: shopTemp, next: '121212' }, shopTok);
  ok('pattern 121212 rejected server-side', weak2.status === 400, weak2.data.error);
  const weak3 = await fn('change-passcode', { current: shopTemp, next: '500001' }, shopTok);
  ok('last 6 of phone rejected server-side', weak3.status === 400, weak3.data.error);
  const wrongCur = await fn('change-passcode', { current: shopTemp === '000001' ? '000002' : '000001', next: '731905' }, shopTok);
  ok('wrong current passcode rejected', wrongCur.status === 400, wrongCur.data.error);
  const good = await fn('change-passcode', { current: shopTemp, next: '731905' }, shopTok);
  ok('valid passcode change succeeds', good.status === 200);
  const { data: p1 } = await service.from('profiles').select('must_change_password').eq('id', created[0]).single();
  ok('must_change_password cleared', p1.must_change_password === false);
  const s2 = await fn('login-by-username', { username: 'e2e.shop', passcode: '731905' });
  ok('login with new passcode works', s2.status === 200 && s2.data.must_change_password === false);

  // 6. lockout after 5 wrong
  let last;
  for (const code of ['111222', '222333', '333444', '444555']) {
    last = await fn('login-by-username', { username: 'e2e.shop', passcode: code });
  }
  ok('wrong passcode → 401 with attempts_left', last.status === 401 && last.data.attempts_left === 1, `left=${last.data.attempts_left}`);
  last = await fn('login-by-username', { username: 'e2e.shop', passcode: '555666' });
  ok('5th wrong passcode locks the account (423)', last.status === 423 && !!last.data.locked_until, last.data.locked_until);
  const whileLocked = await fn('login-by-username', { username: 'e2e.shop', passcode: '731905' });
  ok('correct passcode refused while locked', whileLocked.status === 423);

  // 7. admin unlock + reset
  const un = await fn('admin-update-user', { user_id: created[0], unlock: true }, adminTok);
  ok('admin unlocks account', un.status === 200);
  const afterUnlock = await fn('login-by-username', { username: 'e2e.shop', passcode: '731905' });
  ok('login works after unlock', afterUnlock.status === 200);
  const rs = await fn('admin-reset-password', { user_id: created[0] }, adminTok);
  ok('admin resets passcode → new temp', rs.status === 200 && /^\d{6}$/.test(rs.data.temp_passcode));
  const afterReset = await fn('login-by-username', { username: 'e2e.shop', passcode: rs.data.temp_passcode });
  ok('temp passcode works and forces change', afterReset.status === 200 && afterReset.data.must_change_password === true);

  // 8. disable
  const dis = await fn('admin-update-user', { user_id: created[0], active: false }, adminTok);
  ok('admin disables account', dis.status === 200);
  const disLogin = await fn('login-by-username', { username: 'e2e.shop', passcode: rs.data.temp_passcode });
  ok('disabled account cannot log in (403)', disLogin.status === 403, disLogin.data.error);

  // 9. profile update by self (re-enable first)
  await fn('admin-update-user', { user_id: created[0], active: true }, adminTok);
  const s3 = await fn('login-by-username', { username: 'e2e.shop', passcode: rs.data.temp_passcode });
  const up = await fn('update-profile', { phone: '9876511111', address: 'MG Road' }, s3.data.session?.access_token);
  ok('user updates own phone/address', up.status === 200);

  // 10. RLS via REST as the shop user: profiles visible = own only
  const shopClient = createClient(URL_, PUB, { auth: { persistSession: false } });
  await shopClient.auth.setSession(s3.data.session);
  const { data: visible } = await shopClient.from('profiles').select('id');
  ok('shop user sees only own profile via REST', visible?.length === 1);
  const { error: insErr } = await shopClient.from('designs').insert({ sku: 'X', barcode: 'X', mrp: 1 });
  ok('shop user cannot insert designs via REST', !!insErr, insErr?.message);
  const { data: rpcOk, error: rpcErr } = await shopClient.rpc('sku_exists', { p_sku: 'nope' });
  ok('shop user can call public RPC sku_exists', rpcErr === null && rpcOk === false);
} catch (e) {
  fail++;
  console.error('  ERROR', e);
} finally {
  for (const id of created) {
    await service.from('login_attempts').delete().like('username', 'e2e.%');
    await service.from('profiles').delete().eq('id', id);
    await service.auth.admin.deleteUser(id);
  }
  await service.from('login_attempts').delete().eq('username', 'superadmin');
  await service.from('profiles').update({ failed_logins: 0, locked_until: null }).eq('username', 'superadmin');
  console.log(`\n  → ${pass} passed, ${fail} failed (test users cleaned up)`);
  process.exit(fail ? 1 : 0);
}
