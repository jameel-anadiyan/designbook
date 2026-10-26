// POST { username, passcode } → { session, must_change_password }
// Username → email lookup server-side; 6-digit passcode only;
// IP limit 10 tries / 10 min; account lock 15 min after 5 wrong passcodes.
import { admin, clientIp, handler, HttpError, json, publicClient, str } from '../_shared/util.ts';

const MAX_WRONG = 5;
const LOCK_MINUTES = 15;
const IP_WINDOW_MIN = 10;
const IP_MAX = 10;
const GENERIC = 'Wrong username or passcode.';

Deno.serve(
  handler(async (req, body) => {
    const username = str(body.username).toLowerCase();
    const passcode = str(body.passcode);
    const ip = clientIp(req);

    if (!/^[a-z0-9_.]{3,30}$/.test(username) || !/^\d{6}$/.test(passcode)) {
      throw new HttpError(400, 'Enter your username and 6-digit passcode.');
    }

    // IP rate limit
    const since = new Date(Date.now() - IP_WINDOW_MIN * 60_000).toISOString();
    const { count } = await admin
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('ok', false)
      .gte('created_at', since);
    if ((count ?? 0) >= IP_MAX) {
      throw new HttpError(429, `Too many attempts from this device. Try again in ${IP_WINDOW_MIN} minutes.`);
    }
    const record = (ok: boolean) => admin.from('login_attempts').insert({ ip, username, ok });
    if (Math.random() < 0.02) {
      await admin.from('login_attempts').delete().lt('created_at', new Date(Date.now() - 86_400_000).toISOString());
    }

    const { data: p } = await admin
      .from('profiles')
      .select('id, email, active, failed_logins, locked_until, must_change_password')
      .eq('username', username)
      .maybeSingle();

    if (!p) {
      await record(false);
      throw new HttpError(401, GENERIC);
    }
    if (!p.active) {
      await record(false);
      throw new HttpError(403, 'This account is disabled. Contact your administrator.');
    }
    if (p.locked_until && new Date(p.locked_until) > new Date()) {
      await record(false);
      throw new HttpError(423, 'Account locked after too many wrong passcodes.', { locked_until: p.locked_until });
    }

    const client = publicClient();
    const { data, error } = await client.auth.signInWithPassword({ email: p.email, password: passcode });

    if (error || !data.session) {
      await record(false);
      const failed = (p.failed_logins ?? 0) + 1;
      if (failed >= MAX_WRONG) {
        const until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
        await admin.from('profiles').update({ failed_logins: 0, locked_until: until }).eq('id', p.id);
        throw new HttpError(423, 'Account locked after too many wrong passcodes.', { locked_until: until });
      }
      await admin.from('profiles').update({ failed_logins: failed }).eq('id', p.id);
      throw new HttpError(401, GENERIC, { attempts_left: MAX_WRONG - failed });
    }

    await record(true);
    await admin
      .from('profiles')
      .update({ failed_logins: 0, locked_until: null, last_login_at: new Date().toISOString() })
      .eq('id', p.id);

    return json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      must_change_password: p.must_change_password,
    });
  }),
);
