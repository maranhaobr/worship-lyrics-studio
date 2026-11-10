'use client';

export function EditorTabs<T extends string>({ id, label, tabs, value, onChange }: { id: string; label: string; tabs: readonly { id: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-[#0d1422] p-1 shrink-0">{tabs.map((tab, index) => <button key={tab.id} id={`${id}-tab-${tab.id}`} role="tab" aria-selected={value === tab.id} aria-controls={`${id}-panel-${tab.id}`} tabIndex={value === tab.id ? 0 : -1} className={`flex-1 px-3 py-2 rounded-lg text-sm focus-visible:outline focus-visible:outline-accent ${value === tab.id ? 'bg-panel text-white' : 'text-slate-400 hover:text-white'}`} onClick={() => onChange(tab.id)} onKeyDown={event => {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); onChange(tabs[next].id); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }}>{tab.label}</button>)}</div>;
}
