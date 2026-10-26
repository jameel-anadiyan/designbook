// POST { current, next } — signed-in user changes own passcode.
// Verifies current passcode, rejects weak codes server-side, clears must_change_password.
import { admin, handler, HttpError, json, publicClient, requireUser, str } from '../_shared/util.ts';
import { passcodeProblem } from '../_shared/passcode.ts';

Deno.serve(
  handler(async (req, body) => {
    const me = await requireUser(req);
    const current = str(body.current);
    const next = str(body.next);

    if (!/^\d{6}$/.test(current)) throw new HttpError(400, 'Enter your current 6-digit passcode.');
    const problem = passcodeProblem(next, me.phone);
    if (problem) throw new HttpError(400, problem);
    if (next === current) throw new HttpError(400, 'New passcode must be different from the current one.');

    const verifier = publicClient();
    const { data, error } = await verifier.auth.signInWithPassword({ email: me.email, password: current });
    if (error || !data.session) throw new HttpError(400, 'Current passcode is wrong.');
    await verifier.auth.signOut({ scope: 'local' }).catch(() => {});

    const { error: uErr } = await admin.auth.admin.updateUserById(me.id, { password: next });
    if (uErr) throw new HttpError(400, 'Could not change the passcode.');
    await admin.from('profiles').update({ must_change_password: false }).eq('id', me.id);
    return json({ ok: true });
  }),
);
