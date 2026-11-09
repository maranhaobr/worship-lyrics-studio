'use client';
import { fontFamilies, type VisualStyle } from '@wls/shared';
export function TextStylePanel({ style, onChange }: { style: VisualStyle; onChange: (style: VisualStyle) => void }) {
  const text = style.text;
  const update = (patch: Partial<VisualStyle['text']>) => onChange({ ...style, text: { ...text, ...patch } });
  return <section className="card space-y-3"><h2 className="font-bold">Texto</h2>
    <label><span className="label">Fonte</span><select value={text.fontFamily} onChange={event => update({ fontFamily: event.target.value as typeof text.fontFamily })}>{fontFamilies.map(font => <option key={font}>{font}</option>)}</select></label>
    <label><span className="label">Tamanho: {text.fontSize}px</span><input type="range" min={24} max={240} value={text.fontSize} onChange={event => update({ fontSize: Number(event.target.value) })} /></label>
    <label><span className="label">Peso</span><select value={text.fontWeight ?? '700'} onChange={event => update({ fontWeight: event.target.value as typeof text.fontWeight })}><option value="400">Regular</option><option value="600">Semibold</option><option value="700">Bold</option><option value="900">Extra forte</option></select></label>
    <div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input className="!w-auto" type="checkbox" checked={text.uppercase ?? false} onChange={event => update({ uppercase: event.target.checked })} />CAIXA ALTA</label><label className="flex items-center gap-2 text-sm"><input className="!w-auto" type="checkbox" checked={text.italic ?? false} onChange={event => update({ italic: event.target.checked })} />Itálico</label></div>
    <label><span className="label">Cor do texto</span><input className="h-11 !p-1" type="color" value={text.color} onChange={event => onChange({ ...style, text: { ...text, color: event.target.value } })} /></label>
    <div className="grid grid-cols-2 gap-3"><label><span className="label">Alinhamento</span><select value={text.align} onChange={event => onChange({ ...style, text: { ...text, align: event.target.value as typeof text.align } })}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label>
      <label><span className="label">Posição</span><select value={text.position} onChange={event => onChange({ ...style, text: { ...text, position: event.target.value as typeof text.position } })}><option value="top">Topo</option><option value="center">Centro</option><option value="bottom">Base</option></select></label></div>
    {([
      ['letterSpacing', 'Espaçamento entre letras', -5, 30, .5, 0],
      ['lineHeight', 'Altura da linha', .8, 2, .05, 1.3],
      ['widthPercent', 'Largura do texto (%)', 20, 100, 1, 100],
      ['offsetX', 'Deslocamento horizontal (%)', -35, 35, 1, 0],
      ['offsetY', 'Deslocamento vertical (%)', -35, 35, 1, 0],
      ['strokeWidth', 'Contorno (px)', 0, 6, .5, 0],
    ] as const).map(([key, label, min, max, step, fallback]) => <label key={key}><span className="label">{label}: {text[key] ?? fallback}</span><input type="range" min={min} max={max} step={step} value={text[key] ?? fallback} onChange={event => update({ [key]: Number(event.target.value) })} /></label>)}
    <label><span className="label">Cor do contorno</span><input type="color" className="h-11 !p-1" value={text.strokeColor ?? '#000000'} onChange={event => update({ strokeColor: event.target.value })} /></label>
    <label><span className="label">Sombra e brilho</span><select value={text.shadow ?? 'soft'} onChange={event => update({ shadow: event.target.value as typeof text.shadow })}><option value="none">Sem sombra</option><option value="soft">Sombra suave</option><option value="strong">Sombra forte</option><option value="glow">Brilho</option></select></label>
    <label><span className="label">Faixa atrás do texto</span><select value={text.plate ?? 'none'} onChange={event => update({ plate: event.target.value as typeof text.plate })}><option value="none">Sem faixa</option><option value="dark">Escura</option><option value="light">Clara</option></select></label>
    <p className="text-xs text-slate-400">Oswald, Montserrat, Playfair Display e Dancing Script acompanham o vídeo. Confira frases longas e deslocamentos no preview para evitar cortes.</p>
  </section>;
}
