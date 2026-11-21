'use client';
import { useTranslation } from '@/components/preferences-provider';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { copyClipSelection, pasteClipSelection, moveClipSelection, resizeClip, type LyricClip, type VisualProjectDocument } from '@wls/shared';
import { useToastFeedback } from '@/components/toast-provider';
import type { PlaybackClock } from '@/hooks/use-editor-playback';

let sessionClipboard: LyricClip[] = [];
export function Timeline({ document, clock, selectedId, onSelect, onSeek, onChange, readDocument }: { document: VisualProjectDocument; clock: PlaybackClock; selectedId: string | null; onSelect: (id: string) => boolean | void; onSeek: (ms: number) => void; onChange: (document: VisualProjectDocument | ((current: VisualProjectDocument) => VisualProjectDocument)) => boolean; readDocument: () => VisualProjectDocument | null }) {
  const t = useTranslation();
  const [zoom, setZoom] = useState(60);
  const [ids, setIds] = useState<string[]>(selectedId ? [selectedId] : []);
  const [multiple, setMultiple] = useState(false);
  const [clipboard, setClipboard] = useState(sessionClipboard);
  const { setMessage, setError } = useToastFeedback();
  function copy() {
    const current = readDocument();
    if (!current) return;
    const copied = copyClipSelection(current, ids);
    if (!copied.length) return;
    sessionClipboard = copied; setClipboard(copied); setMessage('Blocos copiados');
  }
  function paste() {
    if (!clipboard.length || !readDocument()) return;
    try {
      let pasted: ReturnType<typeof pasteClipSelection> | undefined;
      const accepted = onChange(current => { pasted = pasteClipSelection(current, clipboard, clock.getTimeMs(), () => crypto.randomUUID()); return pasted.document; });
      if (accepted && pasted) {
        internalSelection.current = pasted.ids[0];
        setIds(pasted.ids); anchor.current = pasted.ids[0];
        onSelect(pasted.ids[0]); onSeek(pasted.startMs); setMessage('Blocos colados');
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível colar os blocos'); }
  }
  const [draft, setDraft] = useState<VisualProjectDocument | null>(null);
  const anchor = useRef(selectedId);
  const internalSelection = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<{ clip: LyricClip; ids: string[]; x: number; scroll: number; mode: 'move' | 'start' | 'end'; min: number; max: number; delta: number; draft: VisualProjectDocument } | null>(null);
  const width = Math.max(600, document.durationMs / 1000 * zoom);
  const selectedSet = new Set(ids);
  const draftById = new Map(draft?.clips.map(clip => [clip.id, clip]));
  const step = zoom < 40 ? 10_000 : zoom < 100 ? 5000 : 1000;
  useEffect(() => { if (internalSelection.current === selectedId) { internalSelection.current = null; return; } internalSelection.current = null; if (selectedId) setIds([selectedId]); }, [selectedId]);
  useEffect(() => { const available = new Set(document.clips.map(clip => clip.id)); setIds(current => current.filter(id => available.has(id))); }, [document.clips]);
  function select(id: string, toggle: boolean, range: boolean) {
    if (onSelect(id) === false) return null;
    internalSelection.current = id;
    const a = document.clips.findIndex(clip => clip.id === anchor.current), b = document.clips.findIndex(clip => clip.id === id);
    const next = range ? document.clips.slice(Math.min(a < 0 ? b : a, b), Math.max(a < 0 ? b : a, b) + 1).map(clip => clip.id)
      : toggle ? ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]
      : ids.includes(id) ? ids : multiple ? [...ids, id] : [id];
    if (!range) anchor.current = id;
    setIds(next); return next;
  }
  function begin(event: React.PointerEvent<HTMLDivElement>, clip: LyricClip, index: number) {
    event.preventDefault();
    if (event.button !== 0) return;
    const selected = select(clip.id, event.ctrlKey || event.metaKey, event.shiftKey);
    event.currentTarget.focus({ preventScroll: true });
    if (!selected || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const edge = (event.target as HTMLElement).dataset.edge;
    const mode = edge === 'start' || edge === 'end' ? edge : 'move';
    if (mode !== 'move') setIds([clip.id]);
    drag.current = { clip, ids: selected, x: event.clientX, scroll: scroller.current?.scrollLeft ?? 0, mode, min: document.clips[index - 1]?.endMs ?? 0, max: document.clips[index + 1]?.startMs ?? document.durationMs, delta: 0, draft: document };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: React.PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active) return;
    const delta = Math.round((event.clientX - active.x + (scroller.current?.scrollLeft ?? 0) - active.scroll) / width * document.durationMs / 100) * 100;
    active.delta = delta;
    if (active.mode === 'move') { active.draft = moveClipSelection(document, active.ids, delta); setDraft(active.draft); return; }
    const minimum = Math.max(100, active.clip.words.length * 10);
    let start = active.clip.startMs, end = active.clip.endMs;
    if (active.mode === 'start') start = Math.max(active.min, Math.min(end - minimum, start + delta));
    if (active.mode === 'end') end = Math.min(active.max, Math.max(start + minimum, end + delta));
    const resized = resizeClip(active.clip, start, end);
    active.draft = { ...document, clips: document.clips.map(clip => clip.id === resized.id ? resized : clip) }; setDraft(active.draft);
  }
  function end() {
    if (drag.current) {
      const active = drag.current;
      if (active.delta && active.mode === 'move' && active.draft !== document) onChange(current => moveClipSelection(current, active.ids, active.delta));
      else if (active.delta) {
        const next = active.draft.clips.find(clip => clip.id === active.clip.id)!;
        if (next.startMs !== active.clip.startMs || next.endMs !== active.clip.endMs) onChange(current => ({ ...current, clips: current.clips.map(clip => clip.id === next.id ? resizeClip(clip, next.startMs, next.endMs) : clip) }));
      }
    }
    drag.current = null; setDraft(null);
  }
  function cancel() { drag.current = null; setDraft(null); }
  function nudge(delta: number) { if (moveClipSelection(document, ids, delta) !== document) onChange(current => moveClipSelection(current, ids, delta)); }
  return <section className="card studio-timeline space-y-3 min-w-0" tabIndex={0} aria-label={t('Timeline')} onKeyDown={event => {
    if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]') || drag.current || event.repeat || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    if (event.key.toLowerCase() === 'c' && ids.length) { event.preventDefault(); copy(); }
    if (event.key.toLowerCase() === 'v' && clipboard.length) { event.preventDefault(); paste(); }
  }}><div className="flex items-center justify-between gap-4 flex-wrap"><h2 className="font-bold">{t("Timeline")}</h2>
    <div className="flex gap-2"><button className="btn-secondary" disabled={!ids.length} onClick={copy}>{t('Copiar blocos')}</button><button className="btn-secondary" disabled={!clipboard.length} onClick={paste}>{t('Colar blocos')}</button></div>
    <label className="flex items-center gap-2 text-sm">{"Zoom"}<input className="!w-32" type="range" min={20} max={180} step={10} value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label></div>
    <div className="flex items-center gap-2 flex-wrap text-xs"><button className="btn-secondary" aria-pressed={multiple} onClick={() => setMultiple(value => !value)}>{t('Selecionar vários')}</button><button className="btn-secondary" onClick={() => setIds(document.clips.map(clip => clip.id))} disabled={!document.clips.length}>{t('Selecionar todos')}</button><button className="btn-secondary" onClick={() => setIds([])} disabled={!ids.length}>{t('Limpar seleção')}</button><span role="status">{ids.length} {t('bloco(s) selecionado(s)')}</span><button className="btn-secondary" disabled={!ids.length} aria-label={t('Mover seleção 0,1 segundo para trás')} onClick={() => nudge(-100)}>−0,1s</button><button className="btn-secondary" disabled={!ids.length} aria-label={t('Mover seleção 0,1 segundo para frente')} onClick={() => nudge(100)}>+0,1s</button></div>
    <PlaybackControls clock={clock} durationMs={document.durationMs} onSeek={onSeek} />
    <p className="text-xs text-slate-400">{t('Ctrl/Cmd+C copia a seleção; Ctrl/Cmd+V cola no cursor. Dentro de um bloco, cola depois dele. Blocos seguintes avançam se faltar espaço. Confira a sincronização com o áudio após colar.')}</p>
    <p className="text-xs text-slate-400">{t('Ctrl/Cmd + clique seleciona blocos; Shift + clique seleciona um intervalo. Arraste um bloco selecionado para mover o grupo. As bordas ajustam apenas um bloco. Setas movem 0,1s; Shift + seta move 1s.')}</p>
    <div ref={scroller} className="overflow-x-auto pb-3"><div className="relative h-36" style={{ width }}>
      <div className="relative h-9 border-b border-slate-600" onClick={event => onSeek((event.clientX - event.currentTarget.getBoundingClientRect().left) / width * document.durationMs)}>
        {Array.from({ length: Math.ceil(document.durationMs / step) }, (_, index) => <span key={index} className="absolute text-xs text-slate-400 border-l border-slate-700 pl-1 h-full" style={{ left: index * step / document.durationMs * width }}>{index * step / 1000}{"s"}</span>)}
      </div>
      <div className="relative h-20 bg-slate-950/40 mt-2">
        {document.clips.map((original, index) => { const clip = draftById.get(original.id) ?? original; return <div key={clip.id} data-timeline-clip={clip.id} role="button" aria-pressed={selectedSet.has(clip.id)} tabIndex={0} aria-label={`${clip.text}, ${(clip.startMs / 1000).toFixed(1)} a ${(clip.endMs / 1000).toFixed(1)} segundos`}
          className={`absolute top-2 h-16 rounded-lg border select-none touch-none cursor-grab overflow-hidden ${selectedSet.has(clip.id) ? 'border-white bg-indigo-600' : 'border-indigo-400/50 bg-indigo-900'}`}
          style={{ left: clip.startMs / document.durationMs * width, width: Math.max(4, (clip.endMs - clip.startMs) / document.durationMs * width) }}
          onPointerDown={event => begin(event, clip, index)} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={cancel}
          onKeyDown={event => { if (event.target instanceof HTMLInputElement) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(clip.id, event.ctrlKey || event.metaKey, event.shiftKey); onSeek(clip.startMs); } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') { event.preventDefault(); setIds(document.clips.map(clip => clip.id)); } else if (event.key === 'Escape') { cancel(); setIds([]); } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); nudge((event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 1000 : 100)); } }}>
          {multiple && <input type="checkbox" className="absolute z-10 top-1 right-3 !w-3 !h-3 !p-0" aria-label={`${t('Selecionar bloco')} ${index + 1}`} checked={selectedSet.has(clip.id)} onPointerDown={event => event.stopPropagation()} onChange={() => select(clip.id, true, false)} />}
          <span data-edge="start" className="absolute left-0 top-0 bottom-0 w-3 bg-white/20 cursor-ew-resize" />
          <div className="px-4 py-2 pointer-events-none text-xs truncate"><div className="opacity-70 truncate">{clip.section}</div><div className="truncate font-semibold">{clip.text}</div></div>
          <span data-edge="end" className="absolute right-0 top-0 bottom-0 w-3 bg-white/20 cursor-ew-resize" />
        </div>; })}
      </div>
      <Playhead clock={clock} durationMs={document.durationMs} width={width} />
    </div></div>
    <p className="text-xs text-slate-400">{t("Arraste os blocos para mover e as bordas para ajustar. Selecione um bloco para editar seus tempos com precisão.")}</p>
  </section>;
}

function PlaybackControls({ clock, durationMs, onSeek }: { clock: PlaybackClock; durationMs: number; onSeek: (ms: number) => void }) {
  const t = useTranslation();
  const timeMs = useSyncExternalStore(clock.subscribe, clock.getTimeMs, () => 0);
  return <label><span className="label">{t("Posição de reprodução · ")}{(timeMs / 1000).toFixed(2)}{" s"}</span><input type="range" min={0} max={durationMs - 1} step={1} value={Math.min(timeMs, durationMs - 1)} onChange={event => onSeek(Number(event.target.value))} /></label>;
}

function Playhead({ clock, durationMs, width }: { clock: PlaybackClock; durationMs: number; width: number }) {
  const timeMs = useSyncExternalStore(clock.subscribe, clock.getTimeMs, () => 0);
  return <div className="absolute top-0 bottom-0 border-l-2 border-rose-400 pointer-events-none" style={{ left: Math.min(timeMs, durationMs) / durationMs * width }} />;
}
