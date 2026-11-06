'use client';
import { useState } from 'react';
import { type TemplatePreset, type VisualStyle } from '@wls/shared';
import { readResponse } from '@/hooks/use-visual-editor';

export function TemplatePicker({ templates, style, onApply, onSaved, onError }: { templates: TemplatePreset[]; style: VisualStyle; onApply: (style: VisualStyle) => void; onSaved: (template: TemplatePreset) => void; onError: (message: string) => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const template = await readResponse<TemplatePreset>(await fetch('/api/visual-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, style }) }));
      onSaved(template); setName('');
    } catch (error) { onError(error instanceof Error ? error.message : 'Erro ao salvar template'); }
    finally { setSaving(false); }
  }
  return <section className="card space-y-3"><h2 className="font-bold">Templates</h2>
    <label><span className="label">Aplicar configuração visual</span><select value="" onChange={event => { const template = templates.find(item => item.id === event.target.value); if (template) onApply(structuredClone(template.style)); }}>
      <option value="" disabled>Escolha um template</option>{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
    </select></label>
    <label><span className="label">Salvar visual como template</span><input value={name} maxLength={100} onChange={event => setName(event.target.value)} placeholder="Nome do template" /></label>
    <button className="btn-secondary" disabled={saving || !name.trim()} onClick={save}>{saving ? 'Salvando...' : 'Salvar template'}</button>
  </section>;
}
