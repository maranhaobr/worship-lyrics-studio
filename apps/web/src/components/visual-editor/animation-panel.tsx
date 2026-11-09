'use client';
import type { VisualStyle } from '@wls/shared';
export function AnimationPanel({ style, onChange }: { style: VisualStyle; onChange: (style: VisualStyle) => void }) {
  return <section className="card space-y-3"><h2 className="font-bold">Animação</h2>
    <label><span className="label">Entrada</span><select value={style.animation.type} onChange={event => onChange({ ...style, animation: { ...style.animation, type: event.target.value as VisualStyle['animation']['type'] } })}><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option><option value="words">Palavra por palavra</option></select></label>
    <label><span className="label">Duração: {style.animation.durationMs} ms</span><input type="range" min={100} max={3000} step={50} value={style.animation.durationMs} onChange={event => onChange({ ...style, animation: { ...style.animation, durationMs: Number(event.target.value) } })} /></label>
    <label><span className="label">Permanência após a frase: {style.animation.holdMs ?? 400} ms</span><input type="range" min={0} max={3000} step={50} value={style.animation.holdMs ?? 400} onChange={event => onChange({ ...style, animation: { ...style.animation, holdMs: Number(event.target.value) } })} /></label>
    <label><span className="label">Saída</span><select value={style.animation.exitType ?? 'fade'} onChange={event => onChange({ ...style, animation: { ...style.animation, exitType: event.target.value as NonNullable<VisualStyle['animation']['exitType']> } })}><option value="none">Sem efeito</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option></select></label>
    {style.animation.exitType !== 'none' && <label><span className="label">Duração da saída: {style.animation.exitDurationMs ?? 300} ms</span><input type="range" min={100} max={3000} step={50} value={style.animation.exitDurationMs ?? 300} onChange={event => onChange({ ...style, animation: { ...style.animation, exitDurationMs: Number(event.target.value) } })} /></label>}
    <p className="text-xs text-slate-400">A permanência prolonga a exibição sem atrasar o canto. A saída termina antes da próxima frase e respeita o fim do vídeo.</p>
  </section>;
}
