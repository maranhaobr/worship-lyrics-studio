import { resolveClipStyle, type LyricClip, type TimedWord, type VisualProjectDocument } from './project';
import type { SongInput } from '../index';
import { templatePresets } from './presets';
import { getSectionHeading } from './section-heading';

export const msToFrame = (time: number, fps: number) => Math.round(time * fps / 1000);
export const frameToMs = (frame: number, fps: number) => frame * 1000 / fps;
export const durationInFrames = (document: VisualProjectDocument) => Math.max(1, Math.ceil(document.durationMs * document.fps / 1000));

/** Detached snapshots include inherited styles and relative gaps. */
export function copyClipSelection(document: VisualProjectDocument, ids: readonly string[]): LyricClip[] {
  const selected = new Set(ids);
  const clips = document.clips.filter(clip => selected.has(clip.id));
  const origin = clips[0]?.startMs ?? 0;
  return clips.map(clip => structuredClone({ ...clip, startMs: clip.startMs - origin, endMs: clip.endMs - origin, style: resolveClipStyle(document.style, clip) }));
}

/** Snap after a containing clip; push the suffix only when the available gap is too short. */
export function pasteClipSelection(document: VisualProjectDocument, copied: readonly LyricClip[], timeMs: number, newId: () => string): { document: VisualProjectDocument; ids: string[]; startMs: number } {
  if (!copied.length || !Number.isFinite(timeMs)) throw new Error('Nenhum bloco para colar');
  let startMs = Math.max(0, Math.min(document.durationMs, Math.round(timeMs)));
  const containing = document.clips.find(clip => clip.startMs < startMs && clip.endMs > startMs);
  if (containing) startMs = containing.endMs;
  const span = copied[copied.length - 1].endMs;
  const next = document.clips.find(clip => clip.startMs >= startMs);
  const shift = next ? Math.max(0, startMs + span - next.startMs) : 0;
  const durationMs = Math.max(document.durationMs + shift, startMs + span);
  if (durationMs > 3_600_000 || document.clips.length + copied.length > 10_000) throw new Error('A colagem excede o limite de duração ou de blocos do projeto');
  const used = new Set(document.clips.map(clip => clip.id));
  const pasted = copied.map(clip => {
    const id = newId();
    if (used.has(id)) throw new Error('ID de bloco duplicado');
    used.add(id);
    return { ...structuredClone(clip), id, startMs: startMs + clip.startMs, endMs: startMs + clip.endMs };
  });
  const clips = [...document.clips.map(clip => clip.startMs >= startMs && shift ? { ...clip, startMs: clip.startMs + shift, endMs: clip.endMs + shift } : clip), ...pasted].sort((a, b) => a.startMs - b.startMs);
  return { document: { ...document, durationMs, clips }, ids: pasted.map(clip => clip.id), startMs };
}

/** One common offset preserves durations, gaps and relative word timings, including nonadjacent selections. */
export function moveClipSelection(document: VisualProjectDocument, ids: readonly string[], deltaMs: number): VisualProjectDocument {
  if (!Number.isFinite(deltaMs)) return document;
  const selected = new Set(ids);
  let min = -Infinity, max = Infinity, previousEnd = 0, nextStart = document.durationMs, count = 0;
  for (const clip of document.clips) {
    if (selected.has(clip.id)) { min = Math.max(min, previousEnd - clip.startMs); count++; }
    else previousEnd = clip.endMs;
  }
  for (let i = document.clips.length - 1; i >= 0; i--) {
    const clip = document.clips[i];
    if (selected.has(clip.id)) max = Math.min(max, nextStart - clip.endMs);
    else nextStart = clip.startMs;
  }
  if (!count) return document;
  const delta = Math.max(min, Math.min(max, Math.round(deltaMs)));
  if (!delta) return document;
  return { ...document, clips: document.clips.map(clip => selected.has(clip.id) ? { ...clip, startMs: clip.startMs + delta, endMs: clip.endMs + delta } : clip) };
}

/** Display tails preserve measured word times and never cover the next slide. */
export function displayClipAt(document: VisualProjectDocument, timeMs: number) {
  for (let i = 0; i < document.clips.length; i++) {
    const clip = document.clips[i];
    if (timeMs < clip.startMs) return undefined;
    const animation = resolveClipStyle(document.style, clip).animation;
    const exitMs = animation.exitType === 'none' ? 0 : (animation.exitDurationMs ?? 300);
    const endMs = Math.min(document.durationMs, document.clips[i + 1]?.startMs ?? document.durationMs, clip.endMs + (animation.holdMs ?? 400) + exitMs);
    if (timeMs < endMs) return { clip, endMs, exitMs: Math.min(exitMs, (endMs - clip.startMs) / 2) };
  }
  return undefined;
}

export function distributeWords(text: string, durationMs: number): TimedWord[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  return words.map((word, index) => ({ text: word, startMs: Math.floor(index * durationMs / words.length), endMs: Math.floor((index + 1) * durationMs / words.length) }));
}

export function resizeClip(clip: LyricClip, startMs: number, endMs: number): LyricClip {
  const scale = (endMs - startMs) / (clip.endMs - clip.startMs);
  return { ...clip, startMs, endMs, words: clip.words.map(word => ({ ...word, startMs: Math.round(word.startMs * scale), endMs: Math.round(word.endMs * scale) })) };
}

export function projectFromSong(song: SongInput, newId: () => string): VisualProjectDocument {
  let cursor = 0;
  const clips: LyricClip[] = song.sections.flatMap(section => {
    let label = section.label;
    return section.lines.flatMap(line => {
      const heading = getSectionHeading(line.text);
      if (heading) { label = heading; return []; }
      const startMs = Math.max(cursor, line.startMs ?? cursor);
      const endMs = line.endMs != null && line.endMs > startMs ? line.endMs : startMs + 4000;
      cursor = endMs;
      return [{ id: newId(), section: label, text: line.text, startMs, endMs, words: distributeWords(line.text, endMs - startMs) }];
    });
  });
  return { schemaVersion: 1, width: 1920, height: 1080, fps: 30, durationMs: Math.max(cursor, 4000), style: structuredClone(templatePresets[0].style), clips };
}
