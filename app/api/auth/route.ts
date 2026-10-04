import { authClient } from '../../../lib/supabase/server';
import { str, choice, sameOrigin, json, handleError, requestOrigin, fail } from '../../../lib/store';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const raw = await req.text(); if (raw.length > 3000) fail('Request too large.', 413);
    const b = JSON.parse(raw), mode = choice(b.mode, ['signin', 'signup']);
    const email = str(b.email, 3, 254);
    if (typeof b.password !== 'string' || b.password.length < 8 || b.password.length > 128) fail('Use a password of 8 to 128 characters.');
    const password = b.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.');
    const client = await authClient();
    const response = mode === 'signin'
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({ email, password, options: { emailRedirectTo: new URL('/auth/callback', requestOrigin(req)).toString() } });
    if (response.error) fail(mode === 'signin' ? 'Sign-in failed. Check your email and password.' : response.error.message);
    return json({ ok: true, confirmationRequired: !response.data.session });
  } catch (e) { return handleError(e); }
}
