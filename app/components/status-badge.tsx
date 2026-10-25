type StatusKind = 'profile' | 'fee' | 'connection' | 'support';

export function StatusBadge({status,kind='profile'}:{status:string;kind?:StatusKind}) {
  const labels:Record<string,string> = {
    active:'Active',pending:kind==='profile'?'Under review':'Pending',suspended:'Suspended',
    incomplete:'Profile incomplete',paid:'Paid',waived:'Fee waived',unpaid:'Fee pending',
    accepted:'Connected',declined:'Declined',closed:'Closed',approved:'Approved',resolved:'Resolved',
  };
  const positive=['active','paid','waived','accepted','approved','resolved'].includes(status);
  const warning=['pending','unpaid','incomplete'].includes(status);
  const negative=['suspended','declined'].includes(status);
  const tone=positive?'border-success/20 bg-success-soft text-success':warning?'border-warning/20 bg-warning-soft text-warning':negative?'border-danger/20 bg-danger-soft text-danger':'border-border bg-surface-alt text-muted';
  return <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium leading-5 ${tone}`}><span aria-hidden="true" className="size-1.5 rounded-full bg-current"/>{labels[status] || status}</span>;
}
