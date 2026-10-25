import { currentUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { canDiscover, visibleProfileWhere } from '@/lib/profile-access';
import { settings, id, now, age, publicProfile, str, choice, hasContact, fail, sameOrigin, json, handleError, recordId } from '../../../lib/store';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return json({ signedIn: false, me: null, matches: [], requests: [], support: [] });
    const p = await prisma.profile.findUnique({ where: { userId: user.userId } });
    const admin = user.isAdmin;
    const url = new URL(req.url);

    if (url.searchParams.has('chat')) {
      if (!p || !canDiscover(p)) fail('Admin approval and a completed registration fee or waiver are required.', 403);
      const cid = recordId(url.searchParams.get('chat'));
      const conn = await prisma.connection.findFirst({ where: { id: cid, OR: [{ senderId: p.id }, { receiverId: p.id }], status: 'accepted' } });
      if (!conn) fail('Connection not found.', 404);
      const otherId = conn.senderId === p.id ? conn.receiverId : conn.senderId;
      if (!await prisma.profile.findFirst({ where: { id: otherId, ...visibleProfileWhere } })) fail('This profile is unavailable.', 403);
      if (await prisma.block.findFirst({ where: { OR: [{ blockerId: p.id, blockedId: otherId }, { blockerId: otherId, blockedId: p.id }] } })) fail('This connection is unavailable.', 403);
      const rows = await prisma.message.findMany({ where: { connectionId: cid }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, senderId: true, body: true, createdAt: true } });
      return json({ messages: rows.reverse().map((m: any) => ({ id: m.id, sender: m.senderId, body: m.body, created_at: m.createdAt.toISOString() })) });
    }

    let matches: any[] = [], requests: any[] = [];
    if (p && canDiscover(p)) {
      const [blocks, rows, connections] = await Promise.all([
        prisma.block.findMany({ where: { OR: [{ blockerId: p.id }, { blockedId: p.id }] }, select: { blockerId: true, blockedId: true } }),
        prisma.profile.findMany({ where: { ...visibleProfileWhere, NOT: { id: p.id } }, take: 200 }),
        prisma.connection.findMany({ where: { OR: [{ senderId: p.id }, { receiverId: p.id }] }, orderBy: { createdAt: 'desc' }, take: 200 }),
      ]);
      const hidden = new Set(blocks.map((b: any) => b.blockerId === p.id ? b.blockedId : b.blockerId));
      matches = rows.filter((r: any) => !hidden.has(r.id)).map(publicProfile);
      const otherIds = [...new Set(connections.map((c: any) => c.senderId === p.id ? c.receiverId : c.senderId))].filter(oid => !hidden.has(oid));
      const others = otherIds.length ? await prisma.profile.findMany({ where: { id: { in: otherIds }, ...visibleProfileWhere } }) : [];
      const byId = new Map<string, any>(others.map((o: any) => [o.id, o]));
      for (const c of connections as any[]) {
        const other = byId.get(c.senderId === p.id ? c.receiverId : c.senderId);
        if (!other) continue;
        const accepted = c.status === 'accepted' && other.status === 'active';
        requests.push({
          id: c.id, other: publicProfile(other),
          direction: c.receiverId === p.id ? 'incoming' : 'outgoing',
          status: accepted ? 'accepted' : c.status === 'accepted' ? 'closed' : c.status,
          note: c.note, createdAt: c.createdAt.toISOString(),
          ...(accepted ? {
            details: { name: other.name, email: other.email },
            photoShared: c.senderId === other.id ? c.senderPhoto : c.receiverPhoto,
            myPhotoShared: c.senderId === p.id ? c.senderPhoto : c.receiverPhoto
          } : {})
        });
      }
    }
    const tickets = await prisma.support.findMany({ where: { userId: user.userId }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, category: true, message: true, status: true, coupon: true, createdAt: true } });
    const adminTickets = admin ? await prisma.support.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }) : undefined;
    return json({
      signedIn: true,
      account: { id: user.userId, email: user.email },
      me: p ? { ...publicProfile(p), name: p.name, email: p.email, dob: p.dob, status: p.status, fee: p.fee, prefMin: p.prefMin, prefMax: p.prefMax, prefCity: p.prefCity } : null,
      matches, requests,
      support: tickets.map((t: any) => ({ ...t, created_at: t.createdAt.toISOString() })),
      admin, adminTickets: adminTickets?.map((t: any) => ({ ...t, email: t.email, created_at: t.createdAt.toISOString() })),
      paymentsReady: !!(settings().RAZORPAY_KEY_ID && settings().RAZORPAY_KEY_SECRET)
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await currentUser(); if (!user) fail('Sign in to continue.', 401);
    if (Number(req.headers.get('content-length') || 0) > 12000) fail('Request too large.', 413);
    const raw = await req.text(); if (raw.length > 12000) fail('Request too large.', 413);
    const b = JSON.parse(raw);

    if (b.action === 'register' || b.action === 'updateProfile') {
      const existing = await prisma.profile.findUnique({ where: { userId: user.userId } });
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
      const fields = { email: user.email, name, dob, gender, city, profession, education, sect, language, marital, manager, about, values: JSON.stringify(b.values), prefMin: min, prefMax: max, prefCity, oathAt: now() };
      if (existing) await prisma.profile.update({ where: { userId: user.userId }, data: { ...fields, status: existing.status === 'suspended' ? 'suspended' : 'pending' } });
      else await prisma.profile.create({ data: { ...fields, id: 'SH-' + crypto.randomUUID().slice(0, 8).toUpperCase(), userId: user.userId } });
      return json({ ok: true });
    }

    if (b.action === 'deleteProfile') {
      const p = await prisma.profile.findUnique({ where: { userId: user.userId } });
      if (p) {
        const oldPhoto = p.photoKey;
        await prisma.profile.delete({ where: { id: p.id } });
        if (oldPhoto) { const { removeLocalPhoto } = await import('../../../lib/photos'); await removeLocalPhoto(oldPhoto); }
      }
      return json({ ok: true });
    }

    if (b.action === 'support') {
      const category = choice(b.category, ['Fee waiver', 'Safety concern', 'General enquiry']), message = str(b.message, 10, 1200);
      const recent = await prisma.support.findMany({ where: { userId: user.userId, createdAt: { gt: new Date(Date.now() - 86400000) } }, take: 5 });
      if (recent.length >= 5) fail('You have already contacted us today. Please wait for a reply.', 429);
      await prisma.support.create({ data: { id: id(), userId: user.userId, email: user.email, category, message } });
      return json({ ok: true });
    }

    if (b.action === 'issueCoupon' || b.action === 'resolveTicket') {
      if (!user.isAdmin) fail('Administrator access required.', 403);
      const ticketId = recordId(b.ticketId);
      if (b.action === 'resolveTicket') {
        await prisma.support.update({ where: { id: ticketId }, data: { status: 'resolved' } });
        return json({ ok: true });
      }
      const ticket = await prisma.support.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.category !== 'Fee waiver' || ticket.coupon) fail('This enquiry is unavailable or already has a coupon.');
      const code = 'SU-' + crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
      await prisma.coupon.create({ data: { code, userId: ticket.userId } });
      await prisma.support.update({ where: { id: ticketId }, data: { status: 'approved', coupon: code } });
      return json({ ok: true, code });
    }

    if (b.action === 'redeem') {
      const code = str(b.code).toUpperCase();
      const p = await prisma.profile.findUnique({ where: { userId: user.userId } });
      if (!p || p.fee !== 'unpaid') fail('No registration fee is outstanding.');
      const coupon = await prisma.coupon.findUnique({ where: { code } });
      if (!coupon || coupon.userId !== user.userId || coupon.redeemedAt) fail('That coupon is invalid or has already been used.');
      await prisma.coupon.update({ where: { code }, data: { redeemedAt: new Date() } });
      await prisma.profile.update({ where: { id: p.id }, data: { fee: 'waived' } });
      return json({ ok: true });
    }

    // Actions requiring an active profile
    const p = await prisma.profile.findUnique({ where: { userId: user.userId } });
    if (!p) fail('Create your profile first.', 403);

    if (b.action === 'preferences') {
      const min = Number(b.min), max = Number(b.max); if (!Number.isInteger(min) || !Number.isInteger(max) || min < 18 || max > 100 || min > max) fail('Choose a valid age range.');
      const city = typeof b.city === 'string' ? b.city.trim().slice(0, 120) : ''; if (hasContact(city)) fail('Keep contact details private.');
      await prisma.profile.update({ where: { id: p.id }, data: { prefMin: min, prefMax: max, prefCity: city } });
      return json({ ok: true });
    }

    if (!canDiscover(p)) fail('Your profile must be approved by an admin and the fee paid or waived before connecting.', 403);

    if (b.action === 'request') {
      const target = recordId(b.target); if (target === p.id) fail('This profile is unavailable.');
      const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: p.id, blockedId: target }, { blockerId: target, blockedId: p.id }] } });
      if (blocked) fail('This profile is unavailable.');
      const other = await prisma.profile.findFirst({ where: { id: target, ...visibleProfileWhere } }); if (!other) fail('Profile not available.', 404);
      if (b.consent !== true) fail('Confirm your consent to share your name and email on acceptance.');
      const note = str(b.note, 1, 500); if (hasContact(note)) fail('Keep contact details out of your request. Share them after acceptance.');
      const recent = await prisma.connection.findMany({ where: { senderId: p.id, createdAt: { gt: new Date(Date.now() - 86400000) } }, take: 10 });
      if (recent.length >= 10) fail('Please wait until tomorrow to send more requests.', 429);
      const pair = [p.id, target].sort().join(':');
      const existingConn = await prisma.connection.findUnique({ where: { pair } });
      if (existingConn) fail('This record already exists.', 409);
      await prisma.connection.create({ data: { id: id(), senderId: p.id, receiverId: target, pair, note } });
      return json({ ok: true });
    }

    if (['accept', 'decline', 'withdraw', 'close', 'photoConsent', 'message', 'block'].includes(b.action)) {
      const cid = recordId(b.connectionId);
      const c = await prisma.connection.findFirst({ where: { id: cid, OR: [{ senderId: p.id }, { receiverId: p.id }] } });
      if (!c) fail('Connection not found.', 404);
      if (['accept', 'message', 'photoConsent'].includes(b.action)) {
        const otherId = c.senderId === p.id ? c.receiverId : c.senderId;
        if (!await prisma.profile.findFirst({ where: { id: otherId, ...visibleProfileWhere } })) fail('This profile is unavailable.', 403);
      }
      if (['message', 'photoConsent'].includes(b.action) && c.status !== 'accepted') fail('Both people must consent before chatting.', 403);
      const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: c.senderId, blockedId: c.receiverId }, { blockerId: c.receiverId, blockedId: c.senderId }] } });
      if (blocked) fail('This connection is unavailable.', 403);

      if (b.action === 'accept' || b.action === 'decline') {
        if (c.receiverId !== p.id || c.status !== 'pending') fail('Only the recipient can respond to a pending request.', 403);
        if (b.action === 'accept' && b.consent !== true) fail('Confirm your consent to share your name and email.');
        const other = await prisma.profile.findFirst({ where: { id: c.senderId, status: 'active' } }); if (!other) fail('This profile is unavailable.');
        await prisma.connection.update({ where: { id: c.id }, data: { status: b.action === 'accept' ? 'accepted' : 'declined', acceptedAt: b.action === 'accept' ? new Date() : null } });
        return json({ ok: true });
      }
      if (b.action === 'withdraw' || b.action === 'close') {
        if (b.action === 'withdraw' && (c.senderId !== p.id || c.status !== 'pending')) fail('Only pending sent requests can be withdrawn.');
        await prisma.connection.update({ where: { id: c.id }, data: { status: 'closed', senderPhoto: false, receiverPhoto: false } });
        return json({ ok: true });
      }
      if (b.action === 'photoConsent') {
        if (typeof b.share !== 'boolean') fail('Choose a valid sharing option.');
        const field = c.senderId === p.id ? 'senderPhoto' : 'receiverPhoto';
        await prisma.connection.update({ where: { id: c.id, status: 'accepted' }, data: { [field]: b.share } });
        return json({ ok: true });
      }
      if (b.action === 'message') {
        const body = str(b.body, 1, 2000);
        const recentMsgs = await prisma.message.count({ where: { senderId: p.id, createdAt: { gt: new Date(Date.now() - 60000) } } });
        if (recentMsgs >= 20) fail('Please wait a moment before sending more messages.');
        await prisma.message.create({ data: { connectionId: c.id, senderId: p.id, body } });
        return json({ ok: true });
      }
      if (b.action === 'block') {
        const otherId = c.senderId === p.id ? c.receiverId : c.senderId;
        const reason = str(b.reason || 'Personal boundary');
        await prisma.block.upsert({ where: { blockerId_blockedId: { blockerId: p.id, blockedId: otherId } }, create: { blockerId: p.id, blockedId: otherId, reason }, update: {} });
        await prisma.connection.update({ where: { id: c.id }, data: { status: 'closed', senderPhoto: false, receiverPhoto: false } });
        return json({ ok: true });
      }
    }
    fail('Unknown action.');
  } catch (e) { return handleError(e); }
}
