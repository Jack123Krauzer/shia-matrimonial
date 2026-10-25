import { signIn, signUp, ensureAdminUser, currentUser } from '../../../lib/auth';
import { str, sameOrigin, json, handleError, fail } from '../../../lib/store';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    // Provision the configured administrator without adding sample accounts.
    await ensureAdminUser();

    const raw = await req.text();
    if (raw.length > 3000) fail('Request too large.', 413);
    const b = JSON.parse(raw);

    const mode = b.mode === 'signup' ? 'signup' : 'signin';
    const email = str(b.email, 3, 254);
    if (typeof b.password !== 'string' || b.password.length < 6 || b.password.length > 128) {
      fail('Use a password of at least 6 characters.');
    }
    const password = b.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.');

    if (mode === 'signin') {
      await signIn(email, password);
    } else {
      await signUp(email, password);
    }

    const user = await currentUser();
    const profile = user ? await prisma.profile.findUnique({ where: { userId:user.userId }, select: { status:true } }) : null;
    return json({ ok: true, confirmationRequired: false, redirect: user?.isAdmin ? '/admin' : mode === 'signup' || profile?.status !== 'active' ? '/registration-confirmation' : '/discover' });
  } catch (e) {
    return handleError(e);
  }
}
