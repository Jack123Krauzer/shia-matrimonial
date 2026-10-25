import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight, ArrowRight, HeartHandshake, LockKeyhole, Sparkles, Check, Compass, MessageCircle, UsersRound } from 'lucide-react';
import { PublicShell, actionClass } from '@/app/public-shell';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  description: 'Find a meaningful marriage connection within the Shia community. Sukoon brings shared faith, family values, and consent-led introductions together.',
};

const features = [
  { icon: Compass, title: 'More than a profile.', copy: 'Discover the beliefs, ambitions, and everyday values that make a person who they are.' },
  { icon: LockKeyhole, title: 'Your privacy comes first.', copy: 'Names and emails unlock only after acceptance. Sharing a photo is a separate choice.' },
  { icon: UsersRound, title: 'A place for your family.', copy: 'Manage your own journey or involve a parent, sibling, or guardian with your informed permission.' },
];

export default function Home() {
  return <PublicShell>
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-0 size-[600px] rounded-full bg-primary-soft/60 blur-3xl"/>
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 py-16 md:px-10 md:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-primary"><Sparkles size={14}/> A thoughtful way to find your person</p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.12] tracking-[-.045em] text-foreground sm:text-6xl xl:text-7xl">Shared faith.<br/>Real connection.<br/><span className="font-display font-normal italic text-primary">A life together.</span></h1>
          <p className="mt-7 max-w-md text-base leading-8 text-muted">Marriage begins with understanding. Meet someone who shares your values and your hopes for what comes next.</p>
          <div className="mt-9 flex flex-wrap items-center gap-6"><Link href="/auth?mode=signup" className={actionClass}>Find your beginning <ArrowUpRight size={18}/></Link><Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary">Explore how it works <ArrowRight size={16}/></Link></div>
          <div className="mt-10 flex flex-wrap gap-5 text-xs text-muted"><span className="flex items-center gap-2"><Check size={15} className="text-primary"/>For serious intentions</span><span className="flex items-center gap-2"><Check size={15} className="text-primary"/>Privacy by choice</span><span className="flex items-center gap-2"><Check size={15} className="text-primary"/>18+ community</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-lg py-4">
          <div className="absolute inset-x-5 inset-y-0 rotate-3 rounded-[2rem] bg-accent-soft" aria-hidden="true"/>
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface shadow-float">
            <div className="bg-primary-strong px-8 py-9 text-white"><div className="mb-6 flex items-center justify-between"><span className="text-xs font-medium tracking-[.16em] text-on-primary-muted">MADE FOR MEANINGFUL CONNECTIONS</span><HeartHandshake size={25} strokeWidth={1.3} className="text-accent-light"/></div><p className="font-display text-4xl leading-tight">Good things begin<br/>with shared values.</p><p className="mt-4 text-sm leading-7 text-on-primary-muted">A little intention. A little courage.<br/>Room for something beautiful.</p></div>
            <div className="space-y-6 px-7 py-8 sm:px-8">{[{icon:Compass,title:'Discover what matters',copy:'Faith. Family. The way you see the world.'},{icon:MessageCircle,title:'Begin with a thoughtful hello',copy:'A respectful introduction, at your own pace.'},{icon:HeartHandshake,title:'Choose the next step together',copy:'Mutual interest. Clear consent. Real possibility.'}].map(({icon:Icon,title,copy})=><div key={title} className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon size={20} strokeWidth={1.5}/></span><div><h2 className="text-sm font-semibold text-foreground">{title}</h2><p className="mt-1 text-xs leading-6 text-muted">{copy}</p></div></div>)}</div>
            <div className="flex items-center gap-2 border-t border-border bg-surface-alt px-8 py-4 text-xs text-muted"><LockKeyhole size={14} className="text-primary"/>Your details. Your decision to share.</div>
          </div>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-24">
      <div className="mx-auto mb-12 max-w-xl text-center"><p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-primary">Considered from the very beginning</p><h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">Finding your person should<br/>feel like being yourself.</h2></div>
      <div className="grid gap-6 md:grid-cols-3">{features.map(({icon:Icon,title,copy})=><article key={title} className="rounded-2xl border border-border bg-surface p-8 shadow-card"><span className="mb-8 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon size={23} strokeWidth={1.5}/></span><h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3><p className="mt-4 text-sm leading-7 text-muted">{copy}</p></article>)}</div>
    </section>
    <section className="mx-auto mb-20 max-w-7xl px-6 md:px-10"><div className="grid gap-8 rounded-3xl bg-primary-soft px-7 py-12 sm:px-12 md:grid-cols-[1fr_auto] md:items-center"><div><p className="mb-4 text-xs font-semibold uppercase tracking-[.18em] text-primary">Your next chapter</p><h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Start with a simple hello.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-muted">One-time ₹100 registration. No recurring subscription.<br/>Fee waivers are available on request.</p></div><Link href="/auth?mode=signup" className={actionClass}>Create your account <ArrowUpRight size={18}/></Link></div></section>
  </PublicShell>;
}
