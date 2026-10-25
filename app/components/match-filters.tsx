'use client';

import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { FilterSelect } from './filter-select';
import { valueOptions } from '@/lib/matrimony';

export type MatchFilterValues = { gender: string; city: string; min: number; max: number; sect: string; manager: string; valuesFilter: string };

export function MatchFilters({ values, cities, expanded, onToggle, onChange, onReset }: {
  values: MatchFilterValues; cities: string[]; expanded: boolean; onToggle: () => void;
  onChange: (patch: Partial<MatchFilterValues>) => void; onReset: () => void;
}) {
  const extraCount = [values.sect, values.manager, values.valuesFilter].filter(Boolean).length;
  const ageInput = 'w-full min-w-0 rounded-xl border border-border bg-surface px-3 py-3 text-center text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft';
  return <section aria-label="Filter matches" className="mb-7 rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary"><SlidersHorizontal size={16}/></span>Find your connection</div><button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-primary-soft hover:text-primary"><RotateCcw size={13}/>Reset filters</button></div>
    <div className="grid items-end gap-5 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.15fr_auto]">
      <FilterSelect label="Looking for" value={values.gender} onChange={gender=>onChange({gender})} options={[{value:'',label:'All profiles'},{value:'Woman',label:'A bride'},{value:'Man',label:'A groom'}]}/>
      <fieldset className="min-w-0"><legend className="mb-2 text-xs font-semibold text-muted">Age range</legend><div className="flex items-center gap-2"><input aria-label="Minimum age" type="number" min={18} max={100} value={values.min || ''} onChange={event=>onChange({min:Number(event.target.value)})} onBlur={()=>{const min=Math.min(100,Math.max(18,values.min));onChange({min,max:Math.max(min,values.max)});}} className={ageInput}/><span className="text-xs text-subtle">to</span><input aria-label="Maximum age" type="number" min={18} max={100} value={values.max || ''} onChange={event=>onChange({max:Number(event.target.value)})} onBlur={()=>{const max=Math.min(100,Math.max(18,values.max));onChange({max,min:Math.min(max,values.min)});}} className={ageInput}/></div></fieldset>
      <FilterSelect label="Location" value={values.city} onChange={city=>onChange({city})} options={[{value:'',label:'Anywhere in India'},...cities.map(city=>({value:city,label:city}))]}/>
      <button type="button" aria-expanded={expanded} aria-controls="additional-match-filters" onClick={onToggle} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${expanded ? 'border-primary bg-primary-soft text-primary' : 'border-border text-primary hover:bg-primary-soft'}`}>More filters{extraCount>0 && <span className="rounded-full bg-primary px-1.5 text-xs text-white">{extraCount}</span>}<ChevronDown size={15} className={expanded ? 'rotate-180' : ''}/></button>
    </div>
    {values.min > values.max && <p role="status" className="mt-3 text-xs text-danger">Minimum age should not exceed maximum age.</p>}
    {expanded && <div id="additional-match-filters" className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-3">
      <FilterSelect label="Community" value={values.sect} onChange={sect=>onChange({sect})} options={[{value:'',label:'All Shia communities'},...['Shia Ithna Ashariyya','Shia Ismaili','Shia Bohra','Other Shia'].map(value=>({value,label:value}))]}/>
      <FilterSelect label="Profile managed by" value={values.manager} onChange={manager=>onChange({manager})} options={[{value:'',label:'Anyone'},{value:'Self',label:'Self'},{value:'Family',label:'Family'}]}/>
      <FilterSelect label="A value that matters" value={values.valuesFilter} onChange={valuesFilter=>onChange({valuesFilter})} options={[{value:'',label:'All values'},...valueOptions.map(value=>({value,label:value}))]}/>
    </div>}
  </section>;
}
