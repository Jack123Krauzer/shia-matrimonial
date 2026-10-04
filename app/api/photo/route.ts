import { currentUser, database } from '../../../lib/supabase/server';
import { result, profile, recordId, isBlocked, connection, sameOrigin, json, fail, handleError, readBody } from '../../../lib/store';
import { readLocalPhoto, writeLocalPhoto, removeLocalPhoto } from '../../../lib/photos';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  try {
    const user = await currentUser(); if (!user) fail('Sign in required.', 401);
    const db = database(), me = await profile(db, user.userId); if (!me) fail('Profile required.', 403);
    const target = recordId(new URL(req.url).searchParams.get('profile'));
    const p = await result(db.from('profiles').select('id,photo_key,status').eq('id', target).maybeSingle()); if (!p?.photo_key) fail('Photo unavailable.', 404);
    if (p.id !== me.id) {
      if (p.status !== 'active' || me.status !== 'active' || await isBlocked(db, p.id, me.id)) fail('Photo unavailable.', 403);
      const c = await result(db.from('connections').select('*').eq('status', 'accepted').eq('pair', [p.id, me.id].sort().join(':')).maybeSingle());
      if (!c || !(c.sender === p.id ? c.sender_photo : c.receiver_photo)) fail('This photo has not been shared with you.', 403);
    }
    const bytes = await readLocalPhoto(p.photo_key); if (!bytes) fail('Photo unavailable.', 404);
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline', 'Vary': 'Cookie' } });
  } catch (e) { return handleError(e); }
}
export async function POST(req: Request) {
  let key: string | null = null;
  try {
    sameOrigin(req); const user = await currentUser(); if (!user) fail('Sign in required.', 401);
    const db = database(), p = await profile(db, user.userId); if (!p) fail('Create your profile first.', 403);
    if (!['image/jpeg', 'image/png'].includes(req.headers.get('content-type') || '')) fail('Choose a JPEG or PNG image.');
    if (Number(req.headers.get('content-length') || 0) > 5 * 1024 * 1024) fail('Choose a photo smaller than 5 MB.', 413);
    const input = Buffer.from(await readBody(req, 5 * 1024 * 1024)); if (input.length > 5 * 1024 * 1024) fail('Choose a photo smaller than 5 MB.', 413);
    key = await writeLocalPhoto(input);
    const old = await result<string | null>(db.rpc('replace_member_photo', { p_profile: p.id, p_key: key }));
    key = null; if (old) await removeLocalPhoto(old); return json({ ok: true });
  } catch (e) { if (key) await removeLocalPhoto(key); return handleError(e); }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req); const user = await currentUser(); if (!user) fail('Sign in required.', 401);
    const db = database(), p = await profile(db, user.userId); if (!p) fail('Profile required.', 403);
    const old = await result<string | null>(db.rpc('replace_member_photo', { p_profile: p.id, p_key: null }));
    if (old) await removeLocalPhoto(old); return json({ ok: true });
  } catch (e) { return handleError(e); }
}
