import { NextResponse } from 'next/server';
import { signOut } from '../../../lib/auth';
import { requestOrigin } from '../../../lib/store';

export async function POST(req: Request) {
  await signOut();
  return NextResponse.redirect(new URL(new URL(req.url).searchParams.get('from') === 'admin' ? '/admin/login' : '/auth', requestOrigin(req)), 303);
}

export async function GET(req: Request) {
  await signOut();
  return NextResponse.redirect(new URL(new URL(req.url).searchParams.get('from') === 'admin' ? '/admin/login' : '/auth', requestOrigin(req)), 303);
}
