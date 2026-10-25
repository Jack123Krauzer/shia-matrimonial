import { POST as mutate } from '../app/route';
import { currentUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { publicProfile, json, fail, handleError } from '../../../lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) fail('Sign in to continue.', 401);
    const p = await prisma.profile.findUnique({ where: { userId: user.userId } });
    return json({
      profile: p
        ? {
            ...publicProfile(p),
            name: p.name,
            email: p.email,
            dob: p.dob,
            status: p.status,
            fee: p.fee,
            prefMin: p.prefMin,
            prefMax: p.prefMax,
            prefCity: p.prefCity,
          }
        : null,
    });
  } catch (e) {
    return handleError(e);
  }
}

async function forward(req: Request, action: string) {
  const raw = await req.text();
  if (raw.length > 12000) return json({ error: 'Request too large.' }, 413);
  try {
    const b = raw ? JSON.parse(raw) : {};
    const headers = new Headers(req.headers);
    headers.delete('content-length');
    headers.set('content-type', 'application/json');
    return mutate(new Request(req.url, { method: 'POST', headers, body: JSON.stringify({ ...b, action }) }));
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
}

export async function POST(req: Request) {
  return forward(req, 'register');
}

export async function PATCH(req: Request) {
  return forward(req, 'updateProfile');
}

export async function DELETE(req: Request) {
  return forward(req, 'deleteProfile');
}
