// Shared helpers for Design Book Edge Functions.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

function pickKey(dictVar: string, legacyVar: string): string {
  const dict = Deno.env.get(dictVar);
  if (dict) {
    try {
      const parsed = JSON.parse(dict) as Record<string, string>;
      if (parsed.default) return parsed.default;
      const first = Object.values(parsed)[0];
      if (first) return first;
    } catch {
      /* fall through */
    }
  }
  const legacy = Deno.env.get(legacyVar);
  if (!legacy) throw new Error(`Missing ${dictVar}/${legacyVar}`);
  return legacy;
}

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SECRET = pickKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
const PUBLISHABLE = pickKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');

const noPersist = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Service client — bypasses RLS. Server-side only. */
export const admin: SupabaseClient = createClient(URL_, SECRET, noPersist);

/** Fresh public client for password sign-in (no shared session state). */
export function publicClient(): SupabaseClient {
  return createClient(URL_, PUBLISHABLE, noPersist);
}

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  address: string | null;
  role: 'super_admin' | 'head_office' | 'shop_user';
  outlet_id: string | null;
  active: boolean;
  must_change_password: boolean;
  failed_logins: number;
  locked_until: string | null;
};

/** Resolve the calling user from the bearer token and load the profile. */
export async function requireUser(req: Request): Promise<Profile> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || token.startsWith('sb_')) throw new HttpError(401, 'Not signed in.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Session expired. Please sign in again.');
  const { data: profile } = await admin.from('profiles').select('*').eq('id', data.user.id).single();
  if (!profile || !profile.active) throw new HttpError(403, 'Account is disabled.');
  return profile as Profile;
}

export async function requireAdmin(req: Request): Promise<Profile> {
  const me = await requireUser(req);
  if (me.role !== 'super_admin') throw new HttpError(403, 'Only a Super Admin can do this.');
  return me;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ??
    'unknown'
  ) || 'unknown';
}

/** Standard wrapper: CORS preflight, POST-only, JSON body, error mapping. */
export function handler(fn: (req: Request, body: Record<string, unknown>) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      return await fn(req, body);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, ...e.extra }, e.status);
      console.error(e);
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  };
}

export const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
