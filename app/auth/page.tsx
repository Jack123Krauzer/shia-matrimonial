'use client';
import { useState } from 'react';
import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';
export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, email, password }) });
      const d = await r.json(); if (!r.ok) throw Error(d.error);
      if (d.confirmationRequired) { setNotice('Check your email to confirm your account, then sign in.'); setMode('signin'); }
      else window.location.assign('/');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="white-card auth-card"><HeartHandshake size={38}/><h1>Sukoon</h1><p>Shia matrimony · a connection by consent.</p><div className="tabs"><button onClick={() => setMode('signin')} className={mode === 'signin' ? 'active' : ''}>Sign in</button><button onClick={() => setMode('signup')} className={mode === 'signup' ? 'active' : ''}>Create account</button></div><form onSubmit={submit}><label className="field-label">Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label><label className="field-label">Password<input type="password" minLength={8} maxLength={128} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)}/></label>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}<button className="btn primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button></form><p>Your email stays private until you accept a connection.</p><Link href="/">Back to matches</Link></section></main>;
}
