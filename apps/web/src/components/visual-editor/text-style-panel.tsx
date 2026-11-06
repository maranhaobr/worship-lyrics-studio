'use client';
import type { VisualStyle } from '@wls/shared';
export function TextStylePanel({ style, onChange }: { style: VisualStyle; onChange: (style: VisualStyle) => void }) {
  const text = style.text;
  return <section className="card space-y-3"><h2 className="font-bold">Texto</h2>
    <label><span className="label">Fonte</span><select value={text.fontFamily} onChange={event => onChange({ ...style, text: { ...text, fontFamily: event.target.value as typeof text.fontFamily } })}>{['Arial', 'Georgia', 'Verdana'].map(font => <option key={font}>{font}</option>)}</select></label>
    <label><span className="label">Tamanho: {text.fontSize}px</span><input type="range" min={24} max={160} value={text.fontSize} onChange={event => onChange({ ...style, text: { ...text, fontSize: Number(event.target.value) } })} /></label>
    <label><span className="label">Cor do texto</span><input className="h-11 !p-1" type="color" value={text.color} onChange={event => onChange({ ...style, text: { ...text, color: event.target.value } })} /></label>
    <div className="grid grid-cols-2 gap-3"><label><span className="label">Alinhamento</span><select value={text.align} onChange={event => onChange({ ...style, text: { ...text, align: event.target.value as typeof text.align } })}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label>
      <label><span className="label">Posição</span><select value={text.position} onChange={event => onChange({ ...style, text: { ...text, position: event.target.value as typeof text.position } })}><option value="top">Topo</option><option value="center">Centro</option><option value="bottom">Base</option></select></label></div>
  </section>;
}
