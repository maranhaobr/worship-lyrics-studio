import { z } from 'zod';

const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Use uma cor hexadecimal');
const ms = z.number().int().min(0).max(3_600_000);
export const fontFamilies = ['Arial', 'Georgia', 'Verdana', 'Oswald', 'Montserrat', 'Playfair Display', 'Dancing Script'] as const;
export const backgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('gradient'), from: color, to: color, angle: z.number().min(0).max(360) }),
  z.object({ type: z.literal('image'), assetId: z.string().min(1) }),
  z.object({ type: z.literal('video'), assetId: z.string().min(1) }),
]);
export const visualStyleSchema = z.object({
  background: backgroundSchema,
  overlay: z.number().min(0).max(0.9),
  text: z.object({ color, fontFamily: z.enum(fontFamilies), fontSize: z.number().int().min(24).max(240), align: z.enum(['left', 'center', 'right']), position: z.enum(['top', 'center', 'bottom']),
    fontWeight: z.enum(['400', '600', '700', '900']).optional(), italic: z.boolean().optional(), uppercase: z.boolean().optional(),
    letterSpacing: z.number().min(-5).max(30).optional(), lineHeight: z.number().min(.8).max(2).optional(),
    widthPercent: z.number().min(20).max(100).optional(), offsetX: z.number().min(-35).max(35).optional(), offsetY: z.number().min(-35).max(35).optional(),
    strokeWidth: z.number().min(0).max(6).optional(), strokeColor: color.optional(), shadow: z.enum(['none', 'soft', 'strong', 'glow']).optional(),
    plate: z.enum(['none', 'dark', 'light']).optional(),
  }),
  decoration: z.object({ theme: z.enum(['none', 'christmas', 'easter', 'paper', 'cinematic', 'bold']), accent: color, intensity: z.number().min(0).max(1), motion: z.boolean() }).optional(),
  animation: z.object({ type: z.enum(['fade', 'slide', 'zoom', 'words']), durationMs: z.number().int().min(100).max(3000), holdMs: z.number().int().min(0).max(3000).optional(), exitType: z.enum(['none', 'fade', 'slide', 'zoom']).optional(), exitDurationMs: z.number().int().min(100).max(3000).optional() }),
});
export const wordSchema = z.object({ text: z.string().trim().min(1).max(500), startMs: ms, endMs: ms });
export const clipSchema = z.object({
  id: z.string().min(1).max(100), section: z.string().max(100), text: z.string().trim().min(1).max(500),
  startMs: ms, endMs: ms, words: z.array(wordSchema).min(1).max(500),
  style: visualStyleSchema.partial().optional(),
});
export const visualProjectSchema = z.object({
  schemaVersion: z.literal(1), width: z.literal(1920), height: z.literal(1080), fps: z.literal(30),
  durationMs: z.number().int().min(100).max(3_600_000), style: visualStyleSchema, clips: z.array(clipSchema).max(10_000),
  referenceAudio: z.object({ assetId: z.string().min(1) }).optional(),
}).superRefine((project, ctx) => {
  const ids = new Set<string>();
  let previousEnd = 0;
  project.clips.forEach((clip, i) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', path: ['clips', i], message });
    if (ids.has(clip.id)) fail('IDs de blocos devem ser únicos');
    ids.add(clip.id);
    if (clip.startMs < previousEnd || clip.endMs <= clip.startMs || clip.endMs > project.durationMs) fail('Blocos devem estar ordenados, sem sobreposição e dentro da duração');
    previousEnd = clip.endMs;
    let wordEnd = 0;
    clip.words.forEach(word => {
      if (word.startMs < wordEnd || word.endMs <= word.startMs || word.endMs > clip.endMs - clip.startMs) fail('Tempos das palavras inválidos');
      wordEnd = word.endMs;
    });
    if (clip.words.map(w => w.text).join(' ') !== clip.text.split(/\s+/u).join(' ')) fail('Palavras devem corresponder à letra');
  });
});
export const projectUpdateSchema = z.object({ name: z.string().trim().min(1).max(200), revision: z.number().int().positive(), document: visualProjectSchema });
export const templateInputSchema = z.object({ name: z.string().trim().min(1).max(100), style: visualStyleSchema });
export type VisualProjectDocument = z.infer<typeof visualProjectSchema>;
export type VisualStyle = z.infer<typeof visualStyleSchema>;
export type LyricClip = z.infer<typeof clipSchema>;
export type TimedWord = z.infer<typeof wordSchema>;
export type TemplatePreset = { id: string; name: string; style: VisualStyle };
export type MediaSource = { src: string; durationMs: number | null };
export type CompositionProps = { document: VisualProjectDocument; media: Record<string, MediaSource> };
export type ProjectView = { id: string; songId: string | null; name: string; revision: number; document: VisualProjectDocument };
export type MediaView = { id: string; name: string; kind: 'image' | 'video' | 'audio'; durationMs: number | null };

export function resolveClipStyle(style: VisualStyle, clip?: LyricClip): VisualStyle {
  return { ...style, ...clip?.style };
}

export function projectBackgrounds(document: VisualProjectDocument) {
  return [document.style.background, ...document.clips.flatMap(clip => clip.style?.background ? [clip.style.background] : [])];
}
