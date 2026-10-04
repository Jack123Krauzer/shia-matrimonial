import { NextResponse } from 'next/server';
import { authClient } from '../../../lib/supabase/server';
import { sameOrigin, requestOrigin, handleError } from '../../../lib/store';
export async function POST(req: Request) {
  try { sameOrigin(req); const client = await authClient(); await client.auth.signOut(); return NextResponse.redirect(new URL('/', requestOrigin(req)), 303); }
  catch (e) { return handleError(e); }
}
