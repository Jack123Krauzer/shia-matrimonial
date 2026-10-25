import { NextResponse } from 'next/server';
import { requestOrigin } from '../../../lib/store';

export async function GET(req: Request) {
  return NextResponse.redirect(new URL('/auth', requestOrigin(req)));
}
