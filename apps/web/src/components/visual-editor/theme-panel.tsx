'use client';
import type { VisualStyle } from '@wls/shared';

export function ThemePanel({ style, onChange }: { style: VisualStyle; onChange: (style: VisualStyle) => void }) {
  const decoration = style.decoration ?? { theme: 'none', accent: '#e8bb65', intensity: .6, motion: true };
  const update = (patch: Partial<typeof decoration>) => onChange({ ...style, decoration: { ...decoration, ...patch } });
  return <section className="card space-y-3"><h2 className="font-bold">Cenário e atmosfera</h2>
    <label><span className="label">Tema decorativo</span><select value={decoration.theme} onChange={event => update({ theme: event.target.value as typeof decoration.theme })}><option value="none">Sem decoração</option><option value="christmas">Natal · estrela e partículas</option><option value="easter">Páscoa · amanhecer e cruz</option><option value="paper">Papel · textura orgânica</option><option value="cinematic">Cinema · luz e vinheta</option><option value="bold">Impacto · luz quente</option></select></label>
    {decoration.theme !== 'none' && <><label><span className="label">Cor dos detalhes</span><input type="color" className="h-11 !p-1" value={decoration.accent} onChange={event => update({ accent: event.target.value })} /></label>
      <label><span className="label">Intensidade: {Math.round(decoration.intensity * 100)}%</span><input type="range" min={0} max={1} step={.05} value={decoration.intensity} onChange={event => update({ intensity: Number(event.target.value) })} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="!w-auto" checked={decoration.motion} onChange={event => update({ motion: event.target.checked })} />Movimento ambiente</label></>}
    <p className="text-xs text-slate-400">Combine a decoração com gradientes, imagens ou vídeos. Para aplicar fonte, cores e cenário juntos, escolha um template.</p>
  </section>;
}
