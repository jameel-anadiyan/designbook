// POST { user_id } → { temp_passcode }. Super Admin only.
// Sets a new temp passcode, forces change on next login, clears any lock.
import { admin, handler, HttpError, json, requireAdmin, str } from '../_shared/util.ts';
import { generatePasscode } from '../_shared/passcode.ts';

Deno.serve(
  handler(async (req, body) => {
    await requireAdmin(req);
    const user_id = str(body.user_id);
    const { data: p } = await admin.from('profiles').select('id, phone').eq('id', user_id).maybeSingle();
    if (!p) throw new HttpError(404, 'User not found.');

    const temp = generatePasscode(p.phone);
    const { error } = await admin.auth.admin.updateUserById(user_id, { password: temp });
    if (error) throw new HttpError(400, 'Could not reset the passcode.');
    await admin
      .from('profiles')
      .update({ must_change_password: true, failed_logins: 0, locked_until: null })
      .eq('id', user_id);
    return json({ temp_passcode: temp });
  }),
);
