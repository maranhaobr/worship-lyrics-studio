'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { resizeClip, type LyricClip, type VisualProjectDocument } from '@wls/shared';
import type { PlaybackClock } from '@/hooks/use-editor-playback';

export function Timeline({ document, clock, selectedId, onSelect, onSeek, onChange }: { document: VisualProjectDocument; clock: PlaybackClock; selectedId: string | null; onSelect: (id: string) => void; onSeek: (ms: number) => void; onChange: (document: VisualProjectDocument) => boolean }) {
  const [zoom, setZoom] = useState(60);
  const [draft, setDraft] = useState<LyricClip | null>(null);
  const drag = useRef<{ clip: LyricClip; x: number; mode: 'move' | 'start' | 'end'; min: number; max: number; draft: LyricClip } | null>(null);
  const width = Math.max(600, document.durationMs / 1000 * zoom);
  const step = zoom < 40 ? 10_000 : zoom < 100 ? 5000 : 1000;
  function begin(event: React.PointerEvent<HTMLDivElement>, clip: LyricClip, index: number) {
    event.preventDefault(); onSelect(clip.id);
    const mode = (event.target as HTMLElement).dataset.edge;
    drag.current = { clip, x: event.clientX, mode: mode === 'start' || mode === 'end' ? mode : 'move', min: document.clips[index - 1]?.endMs ?? 0, max: document.clips[index + 1]?.startMs ?? document.durationMs, draft: clip };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: React.PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active) return;
    const delta = Math.round((event.clientX - active.x) / zoom * 10) * 100;
    const length = active.clip.endMs - active.clip.startMs;
    const minimum = Math.max(100, active.clip.words.length * 10);
    let start = active.clip.startMs, end = active.clip.endMs;
    if (active.mode === 'move') { start = Math.max(active.min, Math.min(active.max - length, start + delta)); end = start + length; }
    if (active.mode === 'start') start = Math.max(active.min, Math.min(end - minimum, start + delta));
    if (active.mode === 'end') end = Math.min(active.max, Math.max(start + minimum, end + delta));
    active.draft = resizeClip(active.clip, start, end); setDraft(active.draft);
  }
  function end() {
    if (drag.current) {
      const next = drag.current.draft;
      if (next !== drag.current.clip) onChange({ ...document, clips: document.clips.map(clip => clip.id === next.id ? next : clip) });
    }
    drag.current = null; setDraft(null);
  }
  return <section className="card studio-timeline space-y-3 min-w-0"><div className="flex items-center justify-between gap-4 flex-wrap"><h2 className="font-bold">Timeline</h2>
    <label className="flex items-center gap-2 text-sm">Zoom<input className="!w-32" type="range" min={20} max={180} step={10} value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label></div>
    <PlaybackControls clock={clock} durationMs={document.durationMs} onSeek={onSeek} />
    <div className="overflow-x-auto pb-3"><div className="relative h-36" style={{ width }}>
      <div className="relative h-9 border-b border-slate-600" onClick={event => onSeek((event.clientX - event.currentTarget.getBoundingClientRect().left) / width * document.durationMs)}>
        {Array.from({ length: Math.ceil(document.durationMs / step) }, (_, index) => <span key={index} className="absolute text-xs text-slate-400 border-l border-slate-700 pl-1 h-full" style={{ left: index * step / document.durationMs * width }}>{index * step / 1000}s</span>)}
      </div>
      <div className="relative h-20 bg-slate-950/40 mt-2">
        {document.clips.map((original, index) => { const clip = draft?.id === original.id ? draft : original; return <div key={clip.id} role="button" aria-pressed={selectedId === clip.id} tabIndex={0} aria-label={`${clip.text}, ${(clip.startMs / 1000).toFixed(1)} a ${(clip.endMs / 1000).toFixed(1)} segundos`}
          className={`absolute top-2 h-16 rounded-lg border select-none touch-none cursor-grab overflow-hidden ${selectedId === clip.id ? 'border-white bg-indigo-600' : 'border-indigo-400/50 bg-indigo-900'}`}
          style={{ left: clip.startMs / document.durationMs * width, width: Math.max(4, (clip.endMs - clip.startMs) / document.durationMs * width) }}
          onPointerDown={event => begin(event, clip, index)} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { drag.current = null; setDraft(null); }}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(clip.id); onSeek(clip.startMs); } }}>
          <span data-edge="start" className="absolute left-0 top-0 bottom-0 w-3 bg-white/20 cursor-ew-resize" />
          <div className="px-4 py-2 pointer-events-none text-xs truncate"><div className="opacity-70 truncate">{clip.section}</div><div className="truncate font-semibold">{clip.text}</div></div>
          <span data-edge="end" className="absolute right-0 top-0 bottom-0 w-3 bg-white/20 cursor-ew-resize" />
        </div>; })}
      </div>
      <Playhead clock={clock} durationMs={document.durationMs} width={width} />
    </div></div>
    <p className="text-xs text-slate-400">Arraste os blocos para mover e as bordas para ajustar. Selecione um bloco para editar seus tempos com precisão.</p>
  </section>;
}

function PlaybackControls({ clock, durationMs, onSeek }: { clock: PlaybackClock; durationMs: number; onSeek: (ms: number) => void }) {
  const timeMs = useSyncExternalStore(clock.subscribe, clock.getTimeMs, () => 0);
  return <label><span className="label">Posição de reprodução · {(timeMs / 1000).toFixed(2)} s</span><input type="range" min={0} max={durationMs - 1} step={1} value={Math.min(timeMs, durationMs - 1)} onChange={event => onSeek(Number(event.target.value))} /></label>;
}

function Playhead({ clock, durationMs, width }: { clock: PlaybackClock; durationMs: number; width: number }) {
  const timeMs = useSyncExternalStore(clock.subscribe, clock.getTimeMs, () => 0);
  return <div className="absolute top-0 bottom-0 border-l-2 border-rose-400 pointer-events-none" style={{ left: Math.min(timeMs, durationMs) / durationMs * width }} />;
}
