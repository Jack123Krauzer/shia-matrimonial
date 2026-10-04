import { NextResponse } from 'next/server';
import { requestOrigin } from '../../../lib/store';
import { authClient } from '../../../lib/supabase/server';
export async function GET(req: Request) {
  const url = new URL(req.url), origin = requestOrigin(req), code = url.searchParams.get('code');
  if (code) {
    const client = await authClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/', origin));
  }
  return NextResponse.redirect(new URL('/auth?error=confirmation', origin));
}
