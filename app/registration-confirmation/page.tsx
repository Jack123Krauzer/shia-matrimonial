import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check, Clock3, ShieldCheck, UserRound } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Registration & Review Status', robots: { index:false, follow:false } };

export default async function RegistrationConfirmation() {
  const user = await currentUser();
  if (!user) redirect('/auth');
  const profile = await prisma.profile.findUnique({ where: { userId:user.userId } });
  const approved = profile?.status === 'active';
  const suspended = profile?.status === 'suspended';
  const feeComplete = profile && ['paid','waived'].includes(profile.fee);
  return <main className="grid min-h-screen place-items-center bg-canvas px-5 py-12">
    <section className="w-full max-w-xl rounded-3xl border border-border bg-surface p-7 shadow-float sm:p-10">
      <Link href="/" className="text-xl font-semibold tracking-tight text-primary">sukoon.</Link>
      <div className="mb-6 mt-9 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">{approved ? <ShieldCheck size={28}/> : <Clock3 size={28}/>}</div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-accent">Registration status</p>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{suspended ? 'Your profile is on hold.' : approved ? 'Your profile has been approved.' : profile ? 'Your details are under review.' : 'Your account has been created.'}</h1>
      <p className="mt-5 text-sm leading-7 text-muted">{suspended ? 'Your profile is hidden from other members. Contact support from your account if you need help.' : approved ? feeComplete ? 'An administrator has approved your details. Your profile is active and you can now discover other approved members.' : 'Your details have been approved. Complete your registration fee or waiver before your profile appears in discovery.' : profile ? 'Your matrimonial profile will be activated once an administrator has checked and approved all your submitted details. Until then, your profile stays hidden from other members.' : 'Complete your profile to submit your details for review. Your matrimonial profile will be activated only after an administrator checks and approves your details.'}</p>
      <p className="mt-5 break-all rounded-xl bg-surface-alt px-4 py-3 text-sm text-primary">{user.email}</p>
      <ol className="my-7 space-y-4 text-sm">
        {[
          ['Account created',true],
          ['Profile details submitted',Boolean(profile)],
          ['Admin review and approval',approved],
          ['Registration fee paid or waived',Boolean(feeComplete)],
        ].map(([label,done])=><li key={String(label)} className="flex items-center gap-3"><span className={`grid size-7 shrink-0 place-items-center rounded-full ${done ? 'bg-primary text-white' : 'bg-surface-alt text-subtle'}`}>{done ? <Check size={14}/> : <Clock3 size={14}/>}</span><span className={done ? 'text-foreground' : 'text-muted'}>{label}</span></li>)}
      </ol>
      <Link href={approved && feeComplete ? '/discover' : '/discover?view=profile'} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-strong"><UserRound size={17}/>{approved && feeComplete ? 'Discover matches' : profile ? 'Manage my profile & registration' : 'Complete my profile'}</Link>
      <form action="/registration-confirmation" method="get"><button type="submit" className="mt-3 min-h-11 w-full rounded-xl border border-border text-sm font-medium text-primary hover:bg-primary-soft">Check review status</button></form>
    </section>
  </main>;
}
