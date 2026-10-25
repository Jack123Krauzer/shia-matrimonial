'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { demoAccounts } from '@/lib/demo-accounts';

const inputClass='mt-2 min-h-12 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary-soft';

export default function AdminLoginForm() {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function authenticate(loginEmail:string,loginPassword:string) {
    if(busy)return;
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:loginEmail,password:loginPassword})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Unable to sign in. Please try again.');
      window.location.assign('/admin');
    }catch(error){setError((error as Error).message);setBusy(false);}
  }
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();void authenticate(email,password);}

  return <main className="grid min-h-screen place-items-center bg-canvas px-5 py-10 font-sans text-foreground">
    <section className="w-full max-w-md">
      <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm text-muted hover:text-primary"><ArrowLeft size={15}/>Back to Sukoon</Link>
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-float">
        <div className="border-b border-border bg-primary-strong px-7 py-8 text-white sm:px-9"><div className="mb-6 flex items-center gap-3 text-xl font-semibold tracking-tight"><ShieldCheck size={26} className="text-accent-light"/>sukoon<span className="text-accent-light">.</span></div><p className="mb-3 text-xs font-medium uppercase tracking-[.2em] text-accent-light">Administration</p><h1 className="text-3xl font-semibold tracking-tight">Admin sign in</h1><p className="mt-3 text-sm leading-7 text-on-primary-muted">Your private workspace for member reviews, approvals, and community support.</p></div>
        <div className="p-7 sm:p-9">
          <form onSubmit={submit} aria-busy={busy} className="space-y-5">
            <label className="block text-sm font-medium">Administrator email<input name="email" type="email" required autoComplete="username" maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} placeholder="admin@example.com" className={inputClass}/></label>
            <label className="block text-sm font-medium">Password<input name="password" type="password" required autoComplete="current-password" minLength={6} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} placeholder="Enter your password" className={inputClass}/></label>
            {error&&<p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm leading-6 text-danger">{error}</p>}
            <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:opacity-60">{busy?'Signing in…':'Sign in to admin'}{!busy&&<ArrowRight size={17}/>}</button>
          </form>
          {process.env.NODE_ENV==='development'&&<div className="mt-6 rounded-xl border border-border bg-canvas p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Local development demo</p><button type="button" disabled={busy} onClick={()=>{setEmail(demoAccounts.admin.email);setPassword(demoAccounts.admin.password);void authenticate(demoAccounts.admin.email,demoAccounts.admin.password);}} className="min-h-11 w-full rounded-xl border border-border bg-primary-soft px-4 py-3 text-sm font-medium text-primary hover:bg-primary hover:text-white disabled:opacity-60">Admin demo</button><p className="mt-3 text-xs leading-6 text-muted">{demoAccounts.admin.email}<br/>Password: {demoAccounts.admin.password}</p></div>}
          <p className="mt-6 flex items-start gap-2 text-xs leading-6 text-muted"><LockKeyhole size={14} className="mt-1 shrink-0"/>Only accounts with administrator permission can access this workspace.</p>
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-muted">Looking for your member account? <Link href="/auth" className="font-medium text-primary hover:underline">Member sign in</Link></p>
    </section>
  </main>;
}
