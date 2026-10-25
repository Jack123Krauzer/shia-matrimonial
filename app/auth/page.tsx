'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { demoAccounts } from '@/lib/demo-accounts';
import { ArrowLeft, ArrowRight, HeartHandshake, LockKeyhole, ShieldCheck } from 'lucide-react';

const inputClass = 'mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary-soft';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'signup') setMode('signup');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await authenticate(email, password, mode);
  }

  async function authenticate(loginEmail: string, loginPassword: string, loginMode: 'signin' | 'signup' = 'signin') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: loginMode, email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sign in. Please try again.');
      window.location.assign(data.redirect || '/discover');
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }

  return <main className="grid min-h-screen bg-canvas font-sans lg:grid-cols-2">
    <section className="relative hidden flex-col justify-between overflow-hidden bg-primary-strong p-12 text-white lg:flex xl:p-20">
      <Link href="/" className="flex w-fit items-center gap-3 text-2xl font-semibold tracking-tight"><HeartHandshake size={30} strokeWidth={1.4}/>sukoon<span className="text-accent">.</span></Link>
      <div className="relative z-10 max-w-lg py-16"><p className="mb-6 text-xs font-semibold uppercase tracking-[.25em] text-accent-light">A meaningful beginning</p><h1 className="font-serif text-6xl leading-[1.12] tracking-tight">Someone to share<br/>your <em className="text-accent-light">forever</em> with.</h1><p className="mt-7 max-w-sm text-base leading-8 text-on-primary-muted">Shared faith, thoughtful introductions, and space for a connection to grow.</p><div className="mt-10 flex items-center gap-3 text-sm text-on-primary-muted"><ShieldCheck size={20} className="text-accent-light"/>Built around your privacy and consent.</div></div>
      <p className="relative z-10 text-xs tracking-wider text-on-primary-muted">FAITH · FAMILY · A FUTURE TOGETHER</p>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-40 size-[540px] rounded-full border border-white/10 p-16"><div className="size-full rounded-full border border-white/10 p-16"><div className="size-full rounded-full border border-white/10"/></div></div>
    </section>
    <section className="flex flex-col px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
      <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm text-muted transition hover:text-primary"><ArrowLeft size={16}/>Back to home</Link>
      <div className="mx-auto my-auto w-full max-w-md py-14">
        <div className="mb-8 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><HeartHandshake size={25} strokeWidth={1.5}/></div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-primary">Welcome to Sukoon</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">{mode === 'signin' ? 'Good to see you.' : 'Your story starts here.'}</h1>
        <p className="mt-4 text-sm leading-7 text-muted">{mode === 'signin' ? 'Sign in to continue your journey toward a meaningful connection.' : 'Create your account and take the first step toward a shared future.'}</p>
        <div className="my-8 flex rounded-xl border border-border bg-surface p-1" aria-label="Account access">
          {(['signin','signup'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} disabled={busy} onClick={()=>{setMode(value);setError('');}} className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${mode === value ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-primary-soft hover:text-primary'}`}>{value === 'signin' ? 'Sign in' : 'Create account'}</button>)}
        </div>
        <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
          <label className="block text-sm font-medium text-foreground">Email address<input className={inputClass} name="email" type="email" autoComplete="email" required maxLength={254} value={email} placeholder="you@example.com" onChange={event=>setEmail(event.target.value)}/></label>
          <label className="block text-sm font-medium text-foreground">Password<input className={inputClass} name="password" type="password" minLength={6} maxLength={128} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required value={password} placeholder={mode === 'signup' ? 'Choose a password (at least 6 characters)' : 'Enter your password'} onChange={event=>setPassword(event.target.value)}/></label>
          {error && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm leading-6 text-danger">{error}</p>}
          <button className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:opacity-60" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}{!busy && <ArrowRight size={17}/>}</button>
        </form>
        {process.env.NODE_ENV === 'development' && mode === 'signin' && <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Try a demo · local development</p>
          <button type="button" disabled={busy} onClick={()=>{const account=demoAccounts.member;setEmail(account.email);setPassword(account.password);void authenticate(account.email,account.password);}} className="w-full rounded-lg border border-border bg-primary-soft px-3 py-3 text-sm font-medium text-primary transition hover:bg-primary hover:text-white disabled:opacity-60">Member demo</button>
          <p className="mt-3 text-xs leading-6 text-muted">Member: {demoAccounts.member.email}<br/>Password: {demoAccounts.member.password}</p>
        </div>}
        <p className="mt-7 flex items-start justify-center gap-2 text-center text-xs leading-6 text-muted"><LockKeyhole size={14} className="mt-1 shrink-0"/>Your personal details are shared only with your consent.</p>
        <p className="mt-5 text-center text-xs text-muted"><Link href="/admin/login" className="font-medium text-primary hover:underline">Administrator sign in</Link></p>
      </div>
      <p className="text-center text-xs text-subtle">© 2026 Sukoon · A thoughtful path to marriage.</p>
    </section>
  </main>;
}
