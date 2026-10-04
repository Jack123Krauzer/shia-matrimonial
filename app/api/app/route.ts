import { currentUser, database, authConfigured } from '../../../lib/supabase/server';
import { result, settings, id, now, age, publicColumns, publicProfile, isBlocked, active, connection, profile, str, choice, hasContact, fail, sameOrigin, json, handleError, recordId } from '../../../lib/store';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function administrator(email: string) { return !!settings().ADMIN_EMAIL && settings().ADMIN_EMAIL!.toLowerCase() === email.toLowerCase(); }

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return json({ signedIn: false, configured: authConfigured(), me: null, matches: [], requests: [], support: [] });
    const db = database(), p = await profile(db, user.userId), admin = administrator(user.email), url = new URL(req.url);
    if (url.searchParams.has('chat')) {
      if (!p) fail('Register first.', 403);
      const cid = recordId(url.searchParams.get('chat')); await connection(db, cid, p.id, true);
      const rows = await result<any[]>(db.from('messages').select('id,sender,body,created_at').eq('connection_id', cid).order('created_at', { ascending: false }).limit(200));
      return json({ messages: rows.reverse() });
    }
    let matches: any[] = [], requests: any[] = [];
    if (p?.status === 'active') {
      const [blocked, rows, connections] = await Promise.all([
        result<any[]>(db.from('blocks').select('blocker,blocked').or(`blocker.eq.${p.id},blocked.eq.${p.id}`)),
        result<any[]>(db.from('profiles').select(publicColumns).eq('status', 'active').neq('id', p.id).limit(200)),
        result<any[]>(db.from('connections').select('*').or(`sender.eq.${p.id},receiver.eq.${p.id}`).order('created_at', { ascending: false }).limit(200)),
      ]);
      const hidden = new Set(blocked.map(b => b.blocker === p.id ? b.blocked : b.blocker));
      matches = rows.filter(r => !hidden.has(r.id)).map(publicProfile);
      const otherIds = [...new Set(connections.map(c => c.sender === p.id ? c.receiver : c.sender))].filter(id => !hidden.has(id));
      const others = otherIds.length ? await result<any[]>(db.from('profiles').select('*').in('id', otherIds)) : [];
      const byId = new Map(others.map(other => [other.id, other]));
      for (const c of connections) {
        const other = byId.get(c.sender === p.id ? c.receiver : c.sender);
        if (!other) continue;
        const accepted = c.status === 'accepted' && other.status === 'active';
        requests.push({ id: c.id, other: publicProfile(other), direction: c.receiver === p.id ? 'incoming' : 'outgoing', status: accepted ? 'accepted' : c.status === 'accepted' ? 'closed' : c.status, note: c.note, createdAt: c.created_at,
          ...(accepted ? { details: { name: other.name, email: other.email }, photoShared: c.sender === other.id ? c.sender_photo : c.receiver_photo, myPhotoShared: c.sender === p.id ? c.sender_photo : c.receiver_photo } : {}) });
      }
    }
    const tickets = await result(db.from('support').select('id,category,message,status,coupon,created_at').eq('user_id', user.userId).order('created_at', { ascending: false }).limit(30));
    const adminTickets = admin ? await result(db.from('support').select('*').order('created_at', { ascending: false }).limit(100)) : undefined;
    return json({ signedIn: true, me: p ? { ...publicProfile(p), name: p.name, email: p.email, dob: p.dob, status: p.status, fee: p.fee, prefMin: p.pref_min, prefMax: p.pref_max, prefCity: p.pref_city } : null, matches, requests, support: tickets, admin, adminTickets, paymentsReady: !!(settings().RAZORPAY_KEY_ID && settings().RAZORPAY_KEY_SECRET) });
  } catch (e) { return handleError(e); }
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await currentUser(); if (!user) fail('Sign in to continue.', 401);
    if (Number(req.headers.get('content-length') || 0) > 12000) fail('Request too large.', 413);
    const raw = await req.text(); if (raw.length > 12000) fail('Request too large.', 413);
    const b = JSON.parse(raw), db = database();
    if (b.action === 'register' || b.action === 'updateProfile') {
      const existing = await profile(db, user.userId);
      if (b.action === 'register' && existing) fail('You already have a profile.');
      if (b.action === 'updateProfile' && !existing) fail('Create a profile first.', 403);
      if (b.oath !== true || b.guardianConsent !== true) fail('Please agree to the oath, terms, and profile consent.');
      const dob = str(b.dob, 10, 10), birth = new Date(dob + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== dob || age(dob) < 18 || age(dob) > 100) fail('The person whose profile is created must be aged 18 or above.');
      const name = str(b.name, 2, 100), gender = choice(b.gender, ['Woman', 'Man']), city = str(b.city), profession = str(b.profession), education = str(b.education), sect = choice(b.sect, ['Shia Ithna Ashariyya', 'Shia Ismaili', 'Shia Bohra', 'Other Shia']), language = str(b.language), marital = choice(b.marital, ['Never married', 'Divorced', 'Widowed']), manager = choice(b.manager, ['Self', 'Parent', 'Sibling', 'Guardian']), about = str(b.about, 30, 1000);
      if (!Array.isArray(b.values) || b.values.length < 1 || b.values.length > 5 || b.values.some((v: any) => !['Faith & spirituality', 'Family-oriented', 'Education', 'Kindness', 'Career', 'Community', 'Simple living'].includes(v))) fail('Choose at least one value.');
      const min = Number(b.prefMin), max = Number(b.prefMax); if (!Number.isInteger(min) || !Number.isInteger(max) || min < 18 || max > 100 || min > max) fail('Please choose a valid age preference.');
      const prefCity = typeof b.prefCity === 'string' ? b.prefCity.trim().slice(0, 120) : '';
      if ([city, profession, education, language, about, prefCity].some(hasContact)) fail('Keep contact details out of your discovery profile. Share them only after acceptance.');
      const fields = { email: user.email, name, dob, gender, city, profession, education, sect, language, marital, manager, about, values: b.values, pref_min: min, pref_max: max, pref_city: prefCity, oath_at: now() };
      if (existing) await result(db.from('profiles').update(fields).eq('user_id', user.userId));
      else await result(db.from('profiles').insert({ ...fields, id: 'SH-' + crypto.randomUUID().slice(0, 8).toUpperCase(), user_id: user.userId, email: user.email }));
      return json({ ok: true });
    }
    if (b.action === 'deleteProfile') {
      const oldPhoto = await result<string | null>(db.rpc('delete_member_profile', { p_user: user.userId }));
      if (oldPhoto) { const { removeLocalPhoto } = await import('../../../lib/photos'); await removeLocalPhoto(oldPhoto); }
      return json({ ok: true });
    }
    if (b.action === 'support') {
      const category = choice(b.category, ['Fee waiver', 'Safety concern', 'General enquiry']), message = str(b.message, 10, 1200);
      const recent = await result<any[]>(db.from('support').select('id').eq('user_id', user.userId).gt('created_at', new Date(Date.now() - 86400000).toISOString()).limit(5));
      if (recent.length >= 5) fail('You have already contacted us today. Please wait for a reply.', 429);
      await result(db.from('support').insert({ id: id(), user_id: user.userId, email: user.email, category, message })); return json({ ok: true });
    }
    if (b.action === 'issueCoupon' || b.action === 'resolveTicket') {
      if (!administrator(user.email)) fail('Administrator access required.', 403);
      const ticketId = recordId(b.ticketId);
      if (b.action === 'resolveTicket') { await result(db.from('support').update({ status: 'resolved' }).eq('id', ticketId)); return json({ ok: true }); }
      const code = 'SU-' + crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
      await result(db.rpc('issue_waiver_coupon', { p_ticket: ticketId, p_code: code })); return json({ ok: true, code });
    }
    if (b.action === 'redeem') { await result(db.rpc('redeem_waiver_coupon', { p_user: user.userId, p_code: str(b.code).toUpperCase() })); return json({ ok: true }); }
    const p = await active(db, user.userId);
    if (b.action === 'preferences') {
      const min = Number(b.min), max = Number(b.max); if (!Number.isInteger(min) || !Number.isInteger(max) || min < 18 || max > 100 || min > max) fail('Choose a valid age range.');
      const city = typeof b.city === 'string' ? b.city.trim().slice(0, 120) : ''; if (hasContact(city)) fail('Keep contact details private.');
      await result(db.from('profiles').update({ pref_min: min, pref_max: max, pref_city: city }).eq('id', p.id)); return json({ ok: true });
    }
    if (b.action === 'request') {
      const target = recordId(b.target); if (target === p.id || await isBlocked(db, p.id, target)) fail('This profile is unavailable.');
      const other = await result(db.from('profiles').select('id').eq('id', target).eq('status', 'active').maybeSingle()); if (!other) fail('Profile not available.', 404);
      if (b.consent !== true) fail('Confirm your consent to share your name and email on acceptance.');
      const note = str(b.note, 1, 500); if (hasContact(note)) fail('Keep contact details out of your request. Share them after acceptance.');
      const recent = await result<any[]>(db.from('connections').select('id').eq('sender', p.id).gt('created_at', new Date(Date.now() - 86400000).toISOString()).limit(10)); if (recent.length >= 10) fail('Please wait until tomorrow to send more requests.', 429);
      await result(db.from('connections').insert({ id: id(), sender: p.id, receiver: target, pair: [p.id, target].sort().join(':'), note })); return json({ ok: true });
    }
    if (['accept', 'decline', 'withdraw', 'close', 'photoConsent', 'message', 'block'].includes(b.action)) {
      const c = await connection(db, recordId(b.connectionId), p.id, ['message', 'photoConsent'].includes(b.action));
      if (b.action === 'accept' || b.action === 'decline') {
        if (c.receiver !== p.id || c.status !== 'pending') fail('Only the recipient can respond to a pending request.', 403);
        if (b.action === 'accept' && b.consent !== true) fail('Confirm your consent to share your name and email.');
        const other = await result(db.from('profiles').select('id').eq('id', c.sender).eq('status', 'active').maybeSingle()); if (!other) fail('This profile is unavailable.');
        const rows = await result<any[]>(db.from('connections').update({ status: b.action === 'accept' ? 'accepted' : 'declined', accepted_at: b.action === 'accept' ? now() : null }).eq('id', c.id).eq('status', 'pending').select('id'));
        if (!rows.length) fail('This request has already been handled.', 409); return json({ ok: true });
      }
      if (b.action === 'withdraw' || b.action === 'close') {
        if (b.action === 'withdraw' && (c.sender !== p.id || c.status !== 'pending')) fail('Only pending sent requests can be withdrawn.');
        await result(db.from('connections').update({ status: 'closed', sender_photo: false, receiver_photo: false }).eq('id', c.id)); return json({ ok: true });
      }
      if (b.action === 'photoConsent') {
        if (typeof b.share !== 'boolean') fail('Choose a valid sharing option.');
        await result(db.from('connections').update({ [c.sender === p.id ? 'sender_photo' : 'receiver_photo']: b.share }).eq('id', c.id).eq('status', 'accepted')); return json({ ok: true });
      }
      if (b.action === 'message') { await result(db.rpc('send_connection_message', { p_profile: p.id, p_connection: c.id, p_body: str(b.body, 1, 2000) })); return json({ ok: true }); }
      if (b.action === 'block') { await result(db.rpc('block_member_connection', { p_profile: p.id, p_connection: c.id, p_reason: str(b.reason || 'Personal boundary') })); return json({ ok: true }); }
    }
    fail('Unknown action.');
  } catch (e) { return handleError(e); }
}
