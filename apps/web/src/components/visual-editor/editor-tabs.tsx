'use client';
import { useTranslation } from '@/components/preferences-provider';
import type { LucideIcon } from 'lucide-react';

export function EditorTabs<T extends string>({ id, label, tabs, value, onChange }: { id: string; label: string; tabs: readonly { id: T; label: string; icon?: LucideIcon }[]; value: T; onChange: (value: T) => void }) {
  const t = useTranslation();
  return <div role="tablist" aria-label={t(label)} className="studio-editor-tabs">{tabs.map((tab, index) => <button key={tab.id} id={`${id}-tab-${tab.id}`} role="tab" aria-selected={value === tab.id} aria-controls={`${id}-panel-${tab.id}`} tabIndex={value === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={event => {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); onChange(tabs[next].id); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }}>{tab.icon && <tab.icon aria-hidden="true" />}<span>{t(tab.label)}</span></button>)}</div>;
}
