'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type SelectOption = { value: string; label: string };

export function FilterSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = Math.max(0, options.findIndex(option => option.value === value));

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  }

  return <div ref={root} className="relative min-w-0">
    <span id={`${id}-label`} className="mb-2 block text-xs font-semibold text-muted">{label}</span>
    <button ref={trigger} type="button" role="combobox" aria-expanded={open} aria-controls={`${id}-options`} aria-haspopup="listbox" aria-labelledby={`${id}-label ${id}-value`} aria-activedescendant={open ? `${id}-option-${active}` : undefined}
      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3 text-left text-sm font-medium text-foreground transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft ${open ? 'border-primary ring-4 ring-primary-soft' : 'border-border hover:border-primary-muted'}`}
      onClick={() => { setActive(selected); setOpen(!open); }}
      onKeyDown={event => {
        if (event.key === 'Tab') { setOpen(false); return; }
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (!open) { setActive(event.key === 'ArrowUp' ? options.length - 1 : selected); setOpen(true); return; }
          setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        } else if ((event.key === 'Enter' || event.key === ' ') && open) { event.preventDefault(); choose(active); }
        else if (event.key.length === 1 && /\S/.test(event.key)) {
          const index = options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase()));
          if (index >= 0) { event.preventDefault(); setActive(index); setOpen(true); }
        }
      }}>
      <span id={`${id}-value`} className="truncate">{options[selected]?.label || 'Select an option'}</span><ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`}/>
    </button>
    {open && <ul id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`} className="absolute inset-x-0 top-full z-40 mt-2 max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-1.5 shadow-float">
      {options.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={option.value === value} onPointerMove={()=>setActive(index)} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(index)} className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${index === active ? 'bg-primary-soft text-primary' : 'text-foreground'} ${option.value === value ? 'font-semibold' : ''}`}><span>{option.label}</span>{option.value === value && <Check size={15} className="shrink-0 text-primary"/>}</li>)}
    </ul>}
  </div>;
}
