import { z } from 'zod';
import { distributeWords } from './timeline';
import { templatePresets } from './presets';
import { visualProjectSchema, type VisualProjectDocument, type VisualStyle } from './project';
import { getSectionHeading } from './section-heading';

export const lyricsImportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  lyrics: z.string().trim().min(1).max(100_000),
  templateId: z.string().min(1).default('builtin-atmospheric'),
  pace: z.enum(['slow', 'balanced', 'fast']).default('balanced'),
  varyEffects: z.boolean().default(true),
});
export type LyricsImportInput = z.infer<typeof lyricsImportSchema>;

export function parseLyrics(lyrics: string): { section: string; text: string }[] {
  let section = 'Parte 1', part = 1, paragraphEnded = false, headingPending = false;
  const result: { section: string; text: string }[] = [];
  for (const raw of lyrics.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { paragraphEnded = true; continue; }
    const heading = getSectionHeading(line);
    if (heading) { section = heading; paragraphEnded = false; headingPending = true; continue; }
    if (paragraphEnded && result.length && !headingPending) section = `Parte ${++part}`;
    paragraphEnded = false; headingPending = false;
    let phrase = '';
    for (const word of line.split(/\s+/u)) {
      if (phrase && phrase.length + word.length + 1 > 90) { result.push({ section, text: phrase }); phrase = ''; }
      phrase = phrase ? `${phrase} ${word}` : word;
    }
    if (phrase) result.push({ section, text: phrase });
  }
  return result;
}

export function projectFromLyrics(input: LyricsImportInput, newId: () => string, style: VisualStyle = templatePresets[0].style): VisualProjectDocument {
  const lines = parseLyrics(input.lyrics);
  if (!lines.length) throw new Error('A letra precisa ter pelo menos uma frase, além dos títulos de seção.');
  const wordsPerMinute = { slow: 80, balanced: 110, fast: 140 }[input.pace];
  const effects = ['fade', 'slide', 'zoom', 'words'] as const;
  let cursor = 0;
  const clips = lines.map((line, index) => {
    const durationMs = Math.round(Math.max(2500, line.text.split(/\s+/u).length * 60_000 / wordsPerMinute + 900) / 100) * 100;
    const startMs = cursor; cursor += durationMs;
    return { ...line, id: newId(), startMs, endMs: cursor, words: distributeWords(line.text, durationMs),
      ...(input.varyEffects ? { style: { animation: { ...style.animation, type: effects[index % effects.length] } } } : {}),
    };
  });
  return visualProjectSchema.parse({ schemaVersion: 1, width: 1920, height: 1080, fps: 30, durationMs: cursor, style: structuredClone(style), clips });
}
