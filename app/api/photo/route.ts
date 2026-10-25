import { currentUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { canDiscover } from '@/lib/profile-access';
import { recordId, sameOrigin, json, fail, handleError, readBody } from '../../../lib/store';
import { readLocalPhoto, writeLocalPhoto, removeLocalPhoto } from '../../../lib/photos';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = await currentUser(); if (!user) fail('Sign in required.', 401);
    const me = await prisma.profile.findUnique({ where: { userId: user.userId } }); if (!me) fail('Profile required.', 403);
    const target = recordId(new URL(req.url).searchParams.get('profile'));
    const p = await prisma.profile.findUnique({ where: { id: target }, select: { id: true, photoKey: true, status: true, fee: true } });
    if (!p?.photoKey) fail('Photo unavailable.', 404);
    if (p.id !== me.id) {
      if (!canDiscover(p) || !canDiscover(me)) fail('Photo unavailable.', 403);
      const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: p.id, blockedId: me.id }, { blockerId: me.id, blockedId: p.id }] } });
      if (blocked) fail('Photo unavailable.', 403);
      const pair = [p.id, me.id].sort().join(':');
      const c = await prisma.connection.findFirst({ where: { pair, status: 'accepted' } });
      if (!c || !(c.senderId === p.id ? c.senderPhoto : c.receiverPhoto)) fail('This photo has not been shared with you.', 403);
    }
    const bytes = await readLocalPhoto(p.photoKey); if (!bytes) fail('Photo unavailable.', 404);
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline', 'Vary': 'Cookie' } });
  } catch (e) { return handleError(e); }
}

export async function POST(req: Request) {
  let key: string | null = null;
  try {
    sameOrigin(req); const user = await currentUser(); if (!user) fail('Sign in required.', 401);
    const p = await prisma.profile.findUnique({ where: { userId: user.userId } }); if (!p) fail('Create your profile first.', 403);
    if (!['image/jpeg', 'image/png'].includes(req.headers.get('content-type') || '')) fail('Choose a JPEG or PNG image.');
    if (Number(req.headers.get('content-length') || 0) > 5 * 1024 * 1024) fail('Choose a photo smaller than 5 MB.', 413);
    const input = Buffer.from(await readBody(req, 5 * 1024 * 1024)); if (input.length > 5 * 1024 * 1024) fail('Choose a photo smaller than 5 MB.', 413);
    key = await writeLocalPhoto(input);
    const old = p.photoKey;
    await prisma.profile.update({ where: { id: p.id }, data: { photoKey: key } });
    // Reset photo sharing on all connections
    await prisma.connection.updateMany({ where: { senderId: p.id }, data: { senderPhoto: false } });
    await prisma.connection.updateMany({ where: { receiverId: p.id }, data: { receiverPhoto: false } });
    key = null; if (old) await removeLocalPhoto(old); return json({ ok: true });
  } catch (e) { if (key) await removeLocalPhoto(key); return handleError(e); }
}

export async function DELETE(req: Request) {
  try {
    sameOrigin(req); const user = await currentUser(); if (!user) fail('Sign in required.', 401);
    const p = await prisma.profile.findUnique({ where: { userId: user.userId } }); if (!p) fail('Profile required.', 403);
    const old = p.photoKey;
    await prisma.profile.update({ where: { id: p.id }, data: { photoKey: null } });
    await prisma.connection.updateMany({ where: { senderId: p.id }, data: { senderPhoto: false } });
    await prisma.connection.updateMany({ where: { receiverId: p.id }, data: { receiverPhoto: false } });
    if (old) await removeLocalPhoto(old); return json({ ok: true });
  } catch (e) { return handleError(e); }
}
