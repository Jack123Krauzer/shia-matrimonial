'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { StatusBadge } from '@/app/components/status-badge';

export type ReviewProfile = {
  id:string; name:string; email:string; dob:string; gender:string; city:string;
  profession:string; education:string; sect:string; language:string; marital:string;
  manager:string; about:string; values:string[]; prefMin:number; prefMax:number;
  prefCity:string; oathAt:string; status:string; fee:string; reviewIssues:string[]; isDemo:boolean; createdAt:string;
};

export function ProfileReview({profile,busy,error,onClose,onApprove,onReload}:{
  profile:ReviewProfile; busy:boolean; error:string; onClose:()=>void; onApprove:()=>void; onReload:()=>void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reviewed,setReviewed] = useState(false);
  useEffect(()=>{
    const node=dialog.current;
    if (node && !node.open) node.showModal();
    return ()=>node?.close();
  },[]);
  // Do not wire the native close event to onClose: Strict Mode's effect cleanup
  // closes and reopens the dialog, which must not clear the selected profile.
  return <dialog ref={dialog} aria-labelledby="profile-review-heading" onCancel={event=>{event.preventDefault();if(!busy)onClose();}} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-2xl overflow-y-auto border-0 border-l border-border bg-surface p-6 text-foreground shadow-float backdrop:bg-primary-strong/40 sm:rounded-l-3xl sm:p-9">
    <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent">Confidential admin review · {profile.id}</p><h2 id="profile-review-heading" className="mt-2 text-2xl font-semibold">{profile.name}</h2>{profile.isDemo && <p className="mt-2 text-xs text-muted">Fictional development profile</p>}</div><button type="button" disabled={busy} aria-label="Close profile review" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-primary-soft"><X size={20}/></button></div>
    <div className="mb-6 flex flex-wrap gap-2"><StatusBadge status={profile.status}/><StatusBadge status={profile.fee} kind="fee"/></div>
    <dl className="grid gap-5 rounded-xl bg-surface-alt p-5 sm:grid-cols-2">{[
      ['Account email',profile.email],['Date of birth',profile.dob],['Gender',profile.gender],['City',profile.city],
      ['Profession',profile.profession],['Education',profile.education],['Community',profile.sect],['Languages',profile.language],
      ['Marital status',profile.marital],['Managed by',profile.manager],['Review status',profile.status],['Fee status',profile.fee],
      ['Age preferences',`${profile.prefMin}–${profile.prefMax}`],['Location preference',profile.prefCity||'Any location'],
      ['Declaration submitted',new Date(profile.oathAt).toLocaleString('en-IN')],
    ].map(([label,value])=><div key={label} className="min-w-0"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl>
    <h3 className="mt-6 font-semibold">Introduction</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">{profile.about}</p>
    <h3 className="mt-5 font-semibold">Values</h3><div className="mt-3 flex flex-wrap gap-2">{profile.values.map(value=><span key={value} className="rounded-lg bg-primary-soft px-3 py-1.5 text-xs text-primary">{value}</span>)}</div>
    {profile.reviewIssues.length>0 ? <div role="alert" className="mt-6 rounded-xl bg-danger-soft p-4 text-sm text-danger"><p className="font-semibold">Resolve these issues before approval:</p><ul className="mt-2 list-inside list-disc space-y-1">{profile.reviewIssues.map(issue=><li key={issue}>{issue}</li>)}</ul></div> : <p className="mt-6 flex items-center gap-2 text-sm text-primary"><ShieldCheck size={18}/>Required profile fields pass validation.</p>}
    {profile.status !== 'active' && <label className="mt-5 flex items-start gap-3 rounded-xl border border-border p-4 text-sm leading-6"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)} className="mt-1 size-4 accent-primary"/>I have checked the submitted details and approve this profile for activation. Payment or a waiver is still required before discovery.</label>}
    {error && <div role="alert" className="mt-4 rounded-xl bg-danger-soft p-4 text-sm leading-6 text-danger"><p>{error}</p><button type="button" disabled={busy} onClick={onReload} className="mt-2 font-semibold underline underline-offset-4">Reload latest details</button></div>}
    {profile.status !== 'active' && !reviewed && <p className="mt-3 text-xs leading-6 text-muted">Check the confirmation above after reviewing the details to enable approval.</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-border px-5 py-3 text-sm text-primary hover:bg-primary-soft">Close</button>{profile.status !== 'active' && <button type="button" disabled={busy||!reviewed||profile.reviewIssues.length>0} onClick={onApprove} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-strong disabled:opacity-50">{busy?'Approving…':'Approve & activate'}</button>}</div>
  </dialog>;
}
