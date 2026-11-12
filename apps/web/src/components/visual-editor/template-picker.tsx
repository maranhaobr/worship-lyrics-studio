'use client';
import { useState } from 'react';
import { type TemplatePreset, type VisualStyle } from '@wls/shared';
import { readResponse } from '@/hooks/use-visual-editor';

export function TemplatePicker({ templates, style, onApply, onSaved, onError }: { templates: TemplatePreset[]; style: VisualStyle; onApply: (style: VisualStyle) => void; onSaved: (template: TemplatePreset) => void; onError: (message: string) => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  function apply(template: TemplatePreset) {
    onApply(structuredClone({ ...template.style, decoration: template.style.decoration ?? { theme: 'none', accent: '#e8bb65', intensity: .6, motion: false } }));
  }
  async function save() {
    setSaving(true);
    try {
      const template = await readResponse<TemplatePreset>(await fetch('/api/visual-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, style }) }));
      onSaved(template); setName('');
    } catch (error) { onError(error instanceof Error ? error.message : 'Erro ao salvar template'); }
    finally { setSaving(false); }
  }
  return <section className="card space-y-3"><h2 className="font-bold">Templates</h2>
    <div className="grid grid-cols-2 gap-2">{templates.filter(template => template.id.startsWith('builtin-')).map(template => {
      const { background, text, decoration } = template.style;
      return <button key={template.id} className="studio-template-option rounded-lg border border-slate-700 overflow-hidden text-left hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => apply(template)} aria-label={`Aplicar ${template.name}`}>
        <div className="aspect-video relative flex items-center justify-center px-3 overflow-hidden" style={{ backgroundImage: background.type === 'gradient' ? `linear-gradient(${background.angle}deg,${background.from},${background.to})` : undefined, backgroundColor: '#111827', color: text.color }}>
          {decoration && <span className="absolute right-2 top-1 text-lg opacity-60" style={{ color: decoration.accent }} aria-hidden="true">{decoration.theme === 'christmas' ? '✦' : decoration.theme === 'easter' ? '✝' : '·'}</span>}
          <span className="text-center leading-tight" style={{ fontFamily: text.fontFamily, fontWeight: Number(text.fontWeight ?? '700'), fontSize: text.fontFamily === 'Dancing Script' ? 20 : 15, textTransform: text.uppercase ? 'uppercase' : undefined }}>Santo para sempre</span>
        </div><span className="block p-2 text-xs">{template.name}</span>
      </button>;
    })}</div>
    <label><span className="label">Aplicar configuração visual</span><select value="" onChange={event => { const template = templates.find(item => item.id === event.target.value); if (template) apply(template); }}>
      <option value="" disabled>Escolha um template</option>{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
    </select></label>
    <label><span className="label">Salvar visual como template</span><input value={name} maxLength={100} onChange={event => setName(event.target.value)} placeholder="Nome do template" /></label>
    <button className="btn-secondary" disabled={saving || !name.trim()} onClick={save}>{saving ? 'Salvando...' : 'Salvar template'}</button>
  </section>;
}
