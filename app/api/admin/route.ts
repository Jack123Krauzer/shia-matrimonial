import { currentUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { sameOrigin, json, fail, handleError, recordId } from '../../../lib/store';
import { profileReviewIssues, visibleProfileWhere } from '@/lib/profile-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user || !user.isAdmin) {
      fail('Administrator access required.', 403);
    }

    const [
      totalUsers,
      totalProfiles,
      activeProfiles,
      pendingProfiles,
      womenCount,
      menCount,
      totalConnections,
      acceptedConnections,
      totalMessages,
      totalTickets,
      pendingTickets,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.profile.count({ where: visibleProfileWhere }),
      prisma.profile.count({ where: { status: 'pending' } }),
      prisma.profile.count({ where: { gender: 'Woman' } }),
      prisma.profile.count({ where: { gender: 'Man' } }),
      prisma.connection.count(),
      prisma.connection.count({ where: { status: 'accepted' } }),
      prisma.message.count(),
      prisma.support.count(),
      prisma.support.count({ where: { status: 'pending' } }),
    ]);

    const [profiles, tickets, connections] = await Promise.all([
      prisma.profile.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true, isAdmin: true, createdAt: true },
          },
        },
      }),
      prisma.support.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.connection.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          sender: { select: { id: true, name: true, city: true, gender: true } },
          receiver: { select: { id: true, name: true, city: true, gender: true } },
        },
      }),
    ]);

    return json({
      canSeedDemo: process.env.NODE_ENV === 'development',
      stats: {
        totalUsers,
        totalProfiles,
        activeProfiles,
        pendingProfiles,
        womenCount,
        menCount,
        totalConnections,
        acceptedConnections,
        totalMessages,
        totalTickets,
        pendingTickets,
      },
      profiles: profiles.map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        dob: p.dob,
        gender: p.gender,
        city: p.city,
        profession: p.profession,
        education: p.education,
        sect: p.sect,
        language: p.language,
        marital: p.marital,
        about: p.about,
        values: JSON.parse(p.values),
        prefMin: p.prefMin,
        prefMax: p.prefMax,
        prefCity: p.prefCity,
        oathAt: p.oathAt,
        reviewIssues: profileReviewIssues(p),
        isDemo: p.id.startsWith('DEMO-'),
        manager: p.manager,
        status: p.status,
        fee: p.fee,
        createdAt: p.createdAt.toISOString(),
        hasPhoto: !!p.photoKey,
      })),
      tickets: tickets.map((t: any) => ({
        id: t.id,
        userId: t.userId,
        email: t.email,
        category: t.category,
        message: t.message,
        status: t.status,
        coupon: t.coupon,
        createdAt: t.createdAt.toISOString(),
      })),
      connections: connections.map((c: any) => ({
        id: c.id,
        sender: c.sender,
        receiver: c.receiver,
        status: c.status,
        note: c.note,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await currentUser();
    if (!user || !user.isAdmin) {
      fail('Administrator access required.', 403);
    }

    const raw = await req.text();
    if (raw.length > 5000) fail('Request too large.', 413);
    const b = JSON.parse(raw);

    if (b.action === 'seedDemoProfiles') {
      if (process.env.NODE_ENV !== 'development') fail('Demo data is available only in development.', 403);
      const { seedDemoProfiles } = await import('@/lib/seed-demo-profiles');
      return json({ ok: true, count: await seedDemoProfiles() });
    }

    if (b.action === 'updateProfileStatus') {
      const pid = recordId(b.profileId);
      if (!['active', 'pending', 'suspended'].includes(b.status)) fail('Choose a valid profile status.');
      const profile = await prisma.profile.findUnique({ where: { id: pid } });
      if (!profile) fail('Profile not found.', 404);
      if (b.status === 'active') {
        if (b.reviewed !== true) fail('Review all submitted details before approving this profile.');
        if (b.reviewVersion !== profile.oathAt) fail('This profile changed. Reload its details before approving.', 409);
        const issues = profileReviewIssues(profile);
        if (issues.length) fail('Profile cannot be approved: ' + issues.join('; '));
        const result = await prisma.profile.updateMany({ where: { id: pid, oathAt: b.reviewVersion }, data: { status: 'active' } });
        if (!result.count) fail('This profile changed. Reload before approving.', 409);
      } else await prisma.profile.update({ where: { id: pid }, data: { status: b.status } });
      return json({ ok: true });
    }

    if (b.action === 'updateProfileFee') {
      const pid = recordId(b.profileId);
      if (!['paid', 'waived', 'unpaid'].includes(b.fee)) fail('Choose a valid fee status.');
      await prisma.profile.update({
        where: { id: pid },
        data: { fee: b.fee },
      });
      return json({ ok: true });
    }

    if (b.action === 'deleteProfile') {
      const pid = recordId(b.profileId);
      await prisma.profile.delete({ where: { id: pid } });
      return json({ ok: true });
    }

    if (b.action === 'issueCoupon') {
      const ticketId = recordId(b.ticketId);
      const ticket = await prisma.support.findUnique({ where: { id: ticketId } });
      if (!ticket) fail('Ticket not found.', 404);
      const code = 'SU-' + crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
      await prisma.coupon.create({
        data: { code, userId: ticket.userId },
      });
      await prisma.support.update({
        where: { id: ticketId },
        data: { status: 'approved', coupon: code },
      });
      return json({ ok: true, code });
    }

    if (b.action === 'resolveTicket') {
      const ticketId = recordId(b.ticketId);
      await prisma.support.update({
        where: { id: ticketId },
        data: { status: 'resolved' },
      });
      return json({ ok: true });
    }

    fail('Unknown admin action.');
  } catch (e) {
    return handleError(e);
  }
}
