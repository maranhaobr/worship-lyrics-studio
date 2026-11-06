'use client';
import type { VisualStyle } from '@wls/shared';
export function AnimationPanel({ style, onChange }: { style: VisualStyle; onChange: (style: VisualStyle) => void }) {
  return <section className="card space-y-3"><h2 className="font-bold">Animação</h2>
    <label><span className="label">Entrada</span><select value={style.animation.type} onChange={event => onChange({ ...style, animation: { ...style.animation, type: event.target.value as VisualStyle['animation']['type'] } })}><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option><option value="words">Palavra por palavra</option></select></label>
    <label><span className="label">Duração: {style.animation.durationMs} ms</span><input type="range" min={100} max={3000} step={50} value={style.animation.durationMs} onChange={event => onChange({ ...style, animation: { ...style.animation, durationMs: Number(event.target.value) } })} /></label>
  </section>;
}
