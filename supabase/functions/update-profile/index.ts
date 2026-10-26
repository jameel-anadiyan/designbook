// POST { phone?, address?, email? } — signed-in user edits own contact details.
// Username and role can only be changed by a Super Admin.
import { admin, handler, HttpError, json, requireUser, str } from '../_shared/util.ts';

Deno.serve(
  handler(async (req, body) => {
    const me = await requireUser(req);
    const patch: Record<string, unknown> = {};

    if (typeof body.phone === 'string') {
      if (str(body.phone).replace(/\D/g, '').length < 10) throw new HttpError(400, 'A valid contact number is required.');
      patch.phone = str(body.phone);
    }
    if (typeof body.address === 'string') patch.address = str(body.address) || null;
    if (typeof body.email === 'string' && str(body.email).toLowerCase() !== me.email) {
      const e = str(body.email).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new HttpError(400, 'A valid email is required.');
      const { data: c } = await admin.from('profiles').select('id').eq('email', e).maybeSingle();
      if (c) throw new HttpError(409, 'That email is already used.');
      const { error } = await admin.auth.admin.updateUserById(me.id, { email: e, email_confirm: true });
      if (error) throw new HttpError(400, 'Could not update the email.');
      patch.email = e;
    }
    if (!Object.keys(patch).length) return json({ ok: true });
    const { error } = await admin.from('profiles').update(patch).eq('id', me.id);
    if (error) throw new HttpError(400, 'Could not save: ' + error.message);
    return json({ ok: true });
  }),
);
