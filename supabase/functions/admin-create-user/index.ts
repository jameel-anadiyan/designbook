// POST { full_name, username, email, phone, address?, role, outlet_id? }
// Super Admin only. Returns the temp passcode ONCE.
import { admin, handler, HttpError, json, requireAdmin, str } from '../_shared/util.ts';
import { generatePasscode } from '../_shared/passcode.ts';

const ROLES = ['super_admin', 'head_office', 'shop_user'] as const;

Deno.serve(
  handler(async (req, body) => {
    const me = await requireAdmin(req);

    const full_name = str(body.full_name);
    const username = str(body.username).toLowerCase();
    const email = str(body.email).toLowerCase();
    const phone = str(body.phone);
    const address = str(body.address) || null;
    const role = str(body.role) as (typeof ROLES)[number];
    let outlet_id = str(body.outlet_id) || null;

    if (full_name.length < 2) throw new HttpError(400, 'Full name is required.');
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
      throw new HttpError(400, 'Username: 3–30 characters, lowercase letters, numbers, dot or underscore.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'A valid email is required.');
    if (phone.replace(/\D/g, '').length < 10) throw new HttpError(400, 'A valid contact number is required.');
    if (!ROLES.includes(role)) throw new HttpError(400, 'Choose a role.');

    if (role === 'shop_user' && !outlet_id) throw new HttpError(400, 'Shop users must belong to an outlet.');
    if (role !== 'shop_user') {
      const { data: ho } = await admin.from('outlets').select('id').eq('is_head_office', true).maybeSingle();
      outlet_id = ho?.id ?? null;
    } else {
      const { data: o } = await admin.from('outlets').select('id, active, is_head_office').eq('id', outlet_id!).maybeSingle();
      if (!o || !o.active) throw new HttpError(400, 'Outlet is not valid.');
      if (o.is_head_office) throw new HttpError(400, 'Shop users must belong to a shop outlet, not Head Office.');
    }

    const { data: clash } = await admin
      .from('profiles')
      .select('username, email')
      .or(`username.eq.${username},email.eq.${email}`);
    if (clash?.some((c) => c.username === username)) throw new HttpError(409, 'That username is taken.');
    if (clash?.some((c) => c.email === email)) throw new HttpError(409, 'That email is already used.');

    const temp = generatePasscode(phone);
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: temp,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { full_name, username },
    });
    if (error || !created.user) {
      throw new HttpError(400, error?.message?.includes('already') ? 'That email is already used.' : 'Could not create the user.');
    }

    const { error: pErr } = await admin.from('profiles').insert({
      id: created.user.id,
      username,
      full_name,
      email,
      phone,
      address,
      role,
      outlet_id,
      must_change_password: true,
      created_by: me.id,
    });
    if (pErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new HttpError(400, 'Could not create the profile: ' + pErr.message);
    }

    return json({ user_id: created.user.id, username, temp_passcode: temp });
  }),
);
