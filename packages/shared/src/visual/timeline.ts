import { resolveClipStyle, type LyricClip, type TimedWord, type VisualProjectDocument } from './project';
import type { SongInput } from '../index';
import { templatePresets } from './presets';
import { getSectionHeading } from './section-heading';

export const msToFrame = (time: number, fps: number) => Math.round(time * fps / 1000);
export const frameToMs = (frame: number, fps: number) => frame * 1000 / fps;
export const durationInFrames = (document: VisualProjectDocument) => Math.max(1, Math.ceil(document.durationMs * document.fps / 1000));

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
