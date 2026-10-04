import { NextResponse } from 'next/server';
import { requestOrigin } from '../../../lib/store';
import { authClient } from '../../../lib/supabase/server';
export async function GET(req: Request) {
  const url = new URL(req.url), origin = requestOrigin(req), tokenHash = url.searchParams.get('token_hash');
  if (tokenHash && url.searchParams.get('type') === 'email') {
    const client = await authClient();
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (!error) return NextResponse.redirect(new URL('/', origin));
  }
  return NextResponse.redirect(new URL('/auth?error=confirmation', origin));
}
