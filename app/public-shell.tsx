import Link from 'next/link';
import { HeartHandshake, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

export const actionClass = 'inline-flex items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-white! no-underline shadow-card transition hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';

export function PublicShell({children}: {children: ReactNode}) {
  return <div className="bg-canvas font-sans text-primary-strong [&_a]:no-underline">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
    <header className="border-b border-border"><nav aria-label="Main navigation" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 md:px-10"><Link href="/" aria-label="Sukoon home" className="flex items-center gap-3 text-primary-strong!"><span className="grid h-12 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><HeartHandshake size={23} strokeWidth={1.2}/></span><span className="text-3xl font-semibold tracking-tight">sukoon<span className="mt-1 block font-sans text-[8px] tracking-[.3em] text-accent">SHIA MATRIMONY</span></span></Link><div className="hidden items-center gap-8 text-sm text-muted md:flex"><Link href="/how-it-works">How it works</Link><Link href="/privacy">Privacy & trust</Link></div><Link href="/auth" className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-xs font-medium text-primary-strong! hover:bg-surface-alt">Member sign in <ArrowUpRight size={15}/></Link></nav></header>
    <main id="main">{children}</main>
    <footer className="border-t border-border px-6 py-9 text-xs text-muted"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6"><div><p className="text-xl font-semibold tracking-tight text-primary">sukoon</p><p className="mt-2">A thoughtful path to marriage.</p></div><nav aria-label="Footer" className="flex flex-wrap gap-6"><Link href="/how-it-works">How it works</Link><Link href="/privacy">Privacy & trust</Link><Link href="/auth">Sign in</Link></nav><span>© 2026 Sukoon · For adults 18+</span></div></footer>
  </div>;
}
