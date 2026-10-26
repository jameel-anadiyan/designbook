// POST { user_id, active?, unlock?, role?, outlet_id?, full_name?, username?, email?, phone?, address? }
// Super Admin only.
import { admin, handler, HttpError, json, requireAdmin, str } from '../_shared/util.ts';

Deno.serve(
  handler(async (req, body) => {
    const me = await requireAdmin(req);
    const user_id = str(body.user_id);
    const { data: p } = await admin.from('profiles').select('*').eq('id', user_id).maybeSingle();
    if (!p) throw new HttpError(404, 'User not found.');

    const patch: Record<string, unknown> = {};
    const authPatch: Record<string, unknown> = {};

    if (typeof body.active === 'boolean' && body.active !== p.active) {
      if (user_id === me.id && !body.active) throw new HttpError(400, 'You cannot disable your own account.');
      patch.active = body.active;
      authPatch.ban_duration = body.active ? 'none' : '876000h';
    }
    if (body.unlock === true) {
      patch.failed_logins = 0;
      patch.locked_until = null;
    }
    if (typeof body.full_name === 'string') {
      if (str(body.full_name).length < 2) throw new HttpError(400, 'Full name is required.');
      patch.full_name = str(body.full_name);
    }
    if (typeof body.phone === 'string') {
      if (str(body.phone).replace(/\D/g, '').length < 10) throw new HttpError(400, 'A valid contact number is required.');
      patch.phone = str(body.phone);
    }
    if (typeof body.address === 'string') patch.address = str(body.address) || null;
    if (typeof body.username === 'string' && str(body.username).toLowerCase() !== p.username) {
      const u = str(body.username).toLowerCase();
      if (!/^[a-z0-9_.]{3,30}$/.test(u)) throw new HttpError(400, 'Username is not valid.');
      const { data: c } = await admin.from('profiles').select('id').eq('username', u).maybeSingle();
      if (c) throw new HttpError(409, 'That username is taken.');
      patch.username = u;
    }
    if (typeof body.email === 'string' && str(body.email).toLowerCase() !== p.email) {
      const e = str(body.email).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new HttpError(400, 'A valid email is required.');
      const { data: c } = await admin.from('profiles').select('id').eq('email', e).maybeSingle();
      if (c) throw new HttpError(409, 'That email is already used.');
      patch.email = e;
      authPatch.email = e;
      authPatch.email_confirm = true;
    }

    const role = typeof body.role === 'string' ? str(body.role) : p.role;
    let outlet = body.outlet_id !== undefined ? str(body.outlet_id) || null : p.outlet_id;
    if (role !== p.role || outlet !== p.outlet_id) {
      if (!['super_admin', 'head_office', 'shop_user'].includes(role)) throw new HttpError(400, 'Role is not valid.');
      if (user_id === me.id && role !== 'super_admin') throw new HttpError(400, 'You cannot remove your own Super Admin role.');
      if (role === 'shop_user') {
        const { data: o } = await admin.from('outlets').select('id, active, is_head_office').eq('id', outlet ?? '').maybeSingle();
        if (!o || !o.active || o.is_head_office) throw new HttpError(400, 'Shop users need an active shop outlet.');
      } else {
        const { data: ho } = await admin.from('outlets').select('id').eq('is_head_office', true).maybeSingle();
        outlet = ho?.id ?? null;
      }
      patch.role = role;
      patch.outlet_id = outlet;
      authPatch.app_metadata = { role };
    }

    if (Object.keys(authPatch).length) {
      const { error } = await admin.auth.admin.updateUserById(user_id, authPatch);
      if (error) throw new HttpError(400, 'Could not update the login: ' + error.message);
    }
    if (Object.keys(patch).length) {
      const { error } = await admin.from('profiles').update(patch).eq('id', user_id);
      if (error) throw new HttpError(400, 'Could not update the user: ' + error.message);
    }
    return json({ ok: true });
  }),
);
