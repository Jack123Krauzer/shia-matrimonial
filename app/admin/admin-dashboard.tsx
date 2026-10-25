'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Clock3, Database, HeartHandshake, Inbox, LayoutDashboard, LoaderCircle, LogOut, MessageCircle, Plus, RefreshCw, Search, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react';
import { ProfileReview, type ReviewProfile } from './profile-review';
import { FilterSelect } from '@/app/components/filter-select';
import { StatusBadge } from '@/app/components/status-badge';

type Tab = 'members' | 'support' | 'connections';
type Ticket = {id:string;email:string;category:string;message:string;status:string;coupon?:string;createdAt:string};
type Connection = {id:string;sender:{name:string;id:string};receiver:{name:string;id:string};status:string;note:string;createdAt:string};
type Dashboard = {stats:Record<string,number>;profiles:ReviewProfile[];tickets:Ticket[];connections:Connection[];canSeedDemo:boolean};
const buttonClass='inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50';

export default function AdminDashboard() {
  const [data,setData]=useState<Dashboard|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [toast,setToast]=useState('');
  const [tab,setTab]=useState<Tab>('members');
  const [search,setSearch]=useState('');
  const [statusFilter,setStatusFilter]=useState('');
  const [busyId,setBusyId]=useState<string|null>(null);
  const [reviewProfile,setReviewProfile]=useState<ReviewProfile|null>(null);

  const loadData=useCallback(async()=>{
    setLoading(true);
    try {
      const response=await fetch('/api/admin',{cache:'no-store'});
      const payload=await response.json();
      if(response.status===401||response.status===403){window.location.assign('/admin/login');return null;}
      if(!response.ok)throw new Error(payload.error||'Unable to load the admin dashboard.');
      setData(payload);return payload as Dashboard;
    } catch(error){setError((error as Error).message);return null;}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void loadData();},[loadData]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer);},[toast]);

  async function adminAction(action:string,payload:Record<string,unknown>) {
    if(busyId)return;
    setError('');setBusyId(String(payload.profileId||payload.ticketId||'global'));
    try {
      const response=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'The action could not be completed.');
      const latest=await loadData();
      if(!latest)throw new Error('The change was saved, but the dashboard could not refresh. Please reload.');
      setReviewProfile(null);
      if(action==='seedDemoProfiles'){setTab('members');setStatusFilter('');setToast('Demo profiles are ready. Select Under review to try the pending examples.');}
      else setToast(action==='updateProfileStatus'&&payload.status==='active'?'Profile approved. Discovery opens when the fee is paid or waived.':result.code?`Waiver coupon issued: ${result.code}`:'Changes saved successfully.');
    }catch(error){setError((error as Error).message);}
    finally{setBusyId(null);}
  }
  function openReview(profile:ReviewProfile){setError('');setReviewProfile(profile);}
  async function reloadReview(){const latest=await loadData();const updated=latest?.profiles.find(profile=>profile.id===reviewProfile?.id);if(updated){setError('');setReviewProfile(updated);}}

  const stats=data?.stats||{};
  const profiles=data?.profiles||[];
  const tickets=data?.tickets||[];
  const connections=data?.connections||[];
  const filtered=profiles.filter(profile=>(!statusFilter||profile.status===statusFilter)&&[profile.name,profile.email,profile.city,profile.id].some(value=>value.toLowerCase().includes(search.toLowerCase())));
  const tabs=[{id:'members' as const,label:'Members',icon:UsersRound,count:profiles.length},{id:'support' as const,label:'Support & waivers',icon:Inbox,count:stats.pendingTickets||0},{id:'connections' as const,label:'Connections',icon:HeartHandshake,count:stats.totalConnections||0}];
  const cards=[{label:'Registered accounts',value:stats.totalUsers||0,icon:UsersRound,detail:`${stats.totalProfiles||0} submitted profiles`},{label:'Awaiting review',value:stats.pendingProfiles||0,icon:Clock3,detail:'Ready for your attention'},{label:'Visible profiles',value:stats.activeProfiles||0,icon:ShieldCheck,detail:'Approved & registration complete'},{label:'Open enquiries',value:stats.pendingTickets||0,icon:Inbox,detail:'Support and fee waiver requests'}];

  function actions(profile:ReviewProfile){return <div className="flex flex-wrap items-center gap-2">
    <button onClick={()=>openReview(profile)} disabled={Boolean(busyId)} className={profile.status==='pending'?`${buttonClass} border-primary! bg-primary! text-white! hover:bg-primary-strong!`:buttonClass}>{profile.status==='pending'?'Review & approve':'View details'}<ChevronRight size={15}/></button>
    {profile.status==='active'&&<button onClick={()=>void adminAction('updateProfileStatus',{profileId:profile.id,status:'suspended'})} disabled={Boolean(busyId)} className="rounded-lg px-2 py-2 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-50">Suspend</button>}
    {profile.fee==='unpaid'&&<button onClick={()=>void adminAction('updateProfileFee',{profileId:profile.id,fee:'waived'})} disabled={Boolean(busyId)} className="rounded-lg px-2 py-2 text-xs font-medium text-primary hover:bg-primary-soft disabled:opacity-50">Waive fee</button>}
    <button aria-label={`Delete ${profile.name}'s profile`} disabled={Boolean(busyId)} onClick={()=>{if(window.confirm(`Permanently delete ${profile.name}'s profile and related connections?`))void adminAction('deleteProfile',{profileId:profile.id});}} className="grid size-9 place-items-center rounded-lg text-subtle transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"><Trash2 size={15}/></button>
  </div>;}

  return <div className="min-h-screen bg-canvas font-sans text-foreground lg:pl-64">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface p-6 lg:flex">
      <Link href="/" className="flex items-center gap-3 text-2xl font-semibold tracking-tight"><span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><HeartHandshake size={24} strokeWidth={1.5}/></span>sukoon<span className="text-accent">.</span></Link>
      <p className="mb-8 ml-13 mt-1 text-[10px] font-semibold uppercase tracking-[.2em] text-subtle">Administration</p>
      <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-subtle">Workspace</p>
      <nav aria-label="Admin navigation" className="space-y-2">{tabs.map(({id,label,icon:Icon,count})=><button key={id} onClick={()=>{setTab(id);setError('');}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${tab===id?'bg-primary-soft text-primary':'text-muted hover:bg-canvas'}`}><Icon size={18}/><span className="flex-1">{label}</span><span className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-muted">{count}</span></button>)}</nav>
      <div className="mt-auto space-y-5"><div className="rounded-2xl border border-border bg-canvas p-4"><ShieldCheck size={23} className="mb-3 text-primary"/><p className="text-sm font-semibold">Thoughtful oversight.</p><p className="mt-2 text-xs leading-6 text-muted">Review details carefully. Member information stays within this private workspace.</p></div><Link href="/discover" className="flex items-center gap-2 px-2 text-sm font-medium text-muted hover:text-primary"><ArrowLeft size={16}/>Member workspace</Link></div>
    </aside>
    <header className="sticky top-0 z-20 flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur-md sm:px-8"><div className="flex items-center gap-2 text-sm text-muted"><LayoutDashboard size={17}/><span>Admin workspace</span><ChevronRight size={14}/><strong className="font-medium text-foreground">{tabs.find(item=>item.id===tab)?.label}</strong></div><div className="flex items-center gap-3"><span className="hidden items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary sm:inline-flex"><ShieldCheck size={13}/>Administrator</span><Link href="/discover" className="grid size-10 place-items-center rounded-xl border border-border text-primary lg:hidden" aria-label="Member workspace"><ArrowUpRight size={18}/></Link><form action="/auth/signout?from=admin" method="post"><button className={buttonClass}><LogOut size={15}/><span className="hidden sm:inline">Sign out</span></button></form></div></header>
    <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-accent">Community management</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">A little care. A stronger community.</h1><p className="mt-3 text-sm leading-7 text-muted">Review introductions, support members, and keep every connection considered.</p></div><button disabled={loading||Boolean(busyId)} onClick={()=>{setError('');void loadData();}} className={buttonClass}><RefreshCw size={15} className={loading?'animate-spin':''}/>Refresh</button></div>
      {error&&!reviewProfile&&<div role="alert" className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-danger/20 bg-danger-soft p-4 text-sm text-danger"><p>{error}</p><button aria-label="Dismiss error" onClick={()=>setError('')}><X size={18}/></button></div>}
      <section aria-label="Community overview" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,icon:Icon,detail})=><article key={label} className="rounded-2xl border border-border bg-surface p-5 shadow-card"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-muted">{label}</p><span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary"><Icon size={18}/></span></div><p className="mt-4 text-3xl font-semibold tracking-tight">{loading&&!data?'—':value}</p><p className="mt-2 text-xs leading-6 text-subtle">{detail}</p></article>)}</section>
      <nav aria-label="Dashboard sections" className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1.5 lg:hidden">{tabs.map(({id,label,count})=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${tab===id?'bg-primary text-white':'text-muted hover:bg-primary-soft'}`}>{label}<span className="text-xs opacity-75">{count}</span></button>)}</nav>
      {loading&&!data?<div role="status" className="grid min-h-64 place-content-center gap-3 text-center text-muted"><LoaderCircle size={28} className="mx-auto animate-spin"/>Loading your workspace…</div>:<>
        {tab==='members'&&<section className="overflow-visible rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-border p-5 sm:p-6"><div><h2 className="text-xl font-semibold tracking-tight">Member directory</h2><p className="mt-2 text-sm text-muted"><button onClick={()=>setStatusFilter('pending')} className="font-medium text-primary underline-offset-4 hover:underline">{stats.pendingProfiles||0} under review</button> · Approval and registration are managed separately.</p></div>{data?.canSeedDemo&&<button disabled={Boolean(busyId)} onClick={()=>void adminAction('seedDemoProfiles',{})} className={buttonClass}><Plus size={16}/>Add demo records</button>}</div>
          <div className="grid gap-4 p-5 sm:grid-cols-[1fr_220px] sm:p-6"><div className="flex min-h-12 items-center gap-2 self-end rounded-xl border border-border bg-canvas px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-soft"><Search size={18} className="shrink-0 text-subtle"/><input aria-label="Search members" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search name, email, location, or profile ID" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-subtle"/></div><FilterSelect label="Profile status" value={statusFilter} onChange={setStatusFilter} options={[{value:'',label:'All statuses'},{value:'pending',label:'Under review'},{value:'active',label:'Active / approved'},{value:'suspended',label:'Suspended'}]}/></div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5 text-xs text-muted sm:px-6"><span>Showing {filtered.length} of {profiles.length} profiles</span><button onClick={()=>{setSearch('');setStatusFilter('');}} className="font-medium text-primary hover:underline">Reset to all statuses</button></div>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-y border-border bg-canvas text-xs font-medium text-muted"><tr>{['Member','Background','Profile status','Registration','Actions'].map(label=><th key={label} scope="col" className="px-6 py-4 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{filtered.map(profile=><tr key={profile.id} className="align-top transition hover:bg-canvas/70"><td className="max-w-72 px-6 py-5"><button onClick={()=>openReview(profile)} className="flex items-start gap-3 text-left"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft font-semibold text-primary">{profile.name.slice(0,1)}</span><span className="min-w-0"><span className="block font-semibold text-foreground hover:text-primary">{profile.name}</span><span className="mt-1 block break-all text-xs text-muted">{profile.email}</span><span className="mt-2 block text-[11px] text-subtle">{profile.id}{profile.isDemo&&' · Demo'}</span></span></button></td><td className="px-6 py-5"><p className="font-medium">{profile.profession}</p><p className="mt-1 text-xs text-muted">{profile.city} · {profile.gender}</p><p className="mt-2 text-xs text-subtle">{profile.education}</p></td><td className="px-6 py-5"><StatusBadge status={profile.status}/>{profile.status==='active'&&profile.fee==='unpaid'&&<p className="mt-2 text-xs text-muted">Hidden until fee is complete</p>}</td><td className="px-6 py-5"><StatusBadge status={profile.fee} kind="fee"/></td><td className="px-6 py-5">{actions(profile)}</td></tr>)}</tbody></table></div>
          <div className="divide-y divide-border lg:hidden">{filtered.map(profile=><article key={profile.id} className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><button onClick={()=>openReview(profile)} className="text-left font-semibold text-primary">{profile.name}</button><p className="mt-1 break-all text-xs text-muted">{profile.email}</p><p className="mt-2 text-xs text-subtle">{profile.id}{profile.isDemo&&' · Demo'}</p></div><StatusBadge status={profile.status}/></div><p className="text-sm text-muted">{profile.profession} · {profile.city}</p><div className="flex flex-wrap items-center justify-between gap-3"><StatusBadge status={profile.fee} kind="fee"/>{actions(profile)}</div></article>)}</div>
          {!filtered.length&&<div className="px-6 py-16 text-center"><UsersRound size={30} className="mx-auto mb-4 text-primary-muted"/><h3 className="text-lg font-semibold">No profiles in this view.</h3><p className="mt-2 text-sm text-muted">Try another status or clear your search.</p><button onClick={()=>{setSearch('');setStatusFilter('');}} className="mt-5 text-sm font-medium text-primary underline underline-offset-4">Show all profiles</button></div>}
        </section>}
        {tab==='support'&&<section className="space-y-4"><div className="mb-5"><h2 className="text-xl font-semibold">Member support</h2><p className="mt-2 text-sm text-muted">All enquiry statuses are shown. Fee waivers never bypass profile review.</p></div>{tickets.map(ticket=><article key={ticket.id} className="rounded-2xl border border-border bg-surface p-6 shadow-card"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent">{ticket.category}</p><h3 className="mt-2 break-all text-base font-semibold">{ticket.email}</h3><p className="mt-2 text-xs text-subtle">{new Date(ticket.createdAt).toLocaleString('en-IN')}</p></div><StatusBadge status={ticket.status} kind="support"/></div><p className="my-5 whitespace-pre-wrap rounded-xl bg-canvas p-4 text-sm leading-7 text-muted">{ticket.message}</p>{ticket.coupon&&<p className="mb-4 break-all text-sm text-primary">Waiver coupon: <code className="font-semibold">{ticket.coupon}</code></p>}<div className="flex flex-wrap gap-3">{ticket.category==='Fee waiver'&&!ticket.coupon&&ticket.status==='pending'&&<button disabled={Boolean(busyId)} onClick={()=>void adminAction('issueCoupon',{ticketId:ticket.id})} className={buttonClass}>Issue waiver coupon</button>}{ticket.status==='pending'&&<button disabled={Boolean(busyId)} onClick={()=>void adminAction('resolveTicket',{ticketId:ticket.id})} className={buttonClass}><Check size={15}/>Mark resolved</button>}</div></article>)}{!tickets.length&&<EmptyState title="No enquiries yet." copy="Member questions and waiver requests will appear here."/>}</section>}
        {tab==='connections'&&<section className="space-y-4"><div className="mb-5"><h2 className="text-xl font-semibold">Connection activity</h2><p className="mt-2 text-sm text-muted">All recent connection statuses. {stats.acceptedConnections||0} accepted · {stats.totalMessages||0} messages.</p></div>{connections.map(connection=><article key={connection.id} className="rounded-2xl border border-border bg-surface p-6 shadow-card"><div className="flex flex-wrap items-center justify-between gap-4"><h3 className="flex flex-wrap items-center gap-3 text-sm font-semibold">{connection.sender?.name}<ArrowUpRight size={16} className="text-subtle"/>{connection.receiver?.name}</h3><StatusBadge status={connection.status} kind="connection"/></div><p className="mt-4 text-sm leading-7 text-muted">{connection.note}</p><p className="mt-4 text-xs text-subtle">{new Date(connection.createdAt).toLocaleString('en-IN')}</p></article>)}{!connections.length&&<EmptyState title="No connections yet." copy="Consent-based connection activity will appear here."/>}</section>}
      </>}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-subtle"><p className="flex items-center gap-1.5"><Database size={13}/>Confidential · Server-stored records</p><span>Sukoon administration</span></footer>
    </main>
    {toast&&<div role="status" className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 items-start gap-3 rounded-2xl bg-primary-strong p-4 text-sm leading-6 text-white shadow-float"><Check size={18} className="mt-1 shrink-0 text-accent-light"/><p className="flex-1">{toast}</p><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={17}/></button></div>}
    {reviewProfile&&<ProfileReview key={`${reviewProfile.id}-${reviewProfile.oathAt}`} profile={reviewProfile} busy={Boolean(busyId)} error={error} onClose={()=>{if(!busyId)setReviewProfile(null);}} onReload={()=>void reloadReview()} onApprove={()=>void adminAction('updateProfileStatus',{profileId:reviewProfile.id,status:'active',reviewed:true,reviewVersion:reviewProfile.oathAt})}/>}
  </div>;
}

function EmptyState({title,copy}:{title:string;copy:string}){return <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center"><MessageCircle size={30} className="mx-auto mb-4 text-primary-muted"/><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm text-muted">{copy}</p></div>;}
