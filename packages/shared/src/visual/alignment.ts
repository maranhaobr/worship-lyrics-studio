import { z } from 'zod';
import { getSectionHeading } from './section-heading';
import { visualProjectSchema, wordSchema, type VisualProjectDocument } from './project';

export const alignedClipSchema = z.object({
  clipId: z.string().min(1), startMs: z.number().int().nonnegative(), endMs: z.number().int().positive(),
  words: z.array(wordSchema).min(1), needsReview: z.boolean(),
});
export const alignmentResultSchema = z.object({
  durationMs: z.number().int().positive().max(3_600_000), clips: z.array(alignedClipSchema).min(1), warnings: z.array(z.string()).max(10_000),
});
export type AlignmentResult = z.infer<typeof alignmentResultSchema>;
export const alignmentJobSchema = z.object({
  id: z.string(), status: z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'APPLIED', 'CANCELLED']),
  progress: z.number(), error: z.string().nullable(), result: alignmentResultSchema.nullable(), audioAssetId: z.string(),
  workerOnline: z.boolean(),
});
export type AlignmentJobView = z.infer<typeof alignmentJobSchema>;

export function alignmentLyrics(document: VisualProjectDocument) {
  return document.clips.filter(clip => !getSectionHeading(clip.text));
}

/** Visual-only edits can be merged; manual timing/lyric edits cannot be overwritten. */
export function alignmentInputMatches(before: VisualProjectDocument, current: VisualProjectDocument): boolean {
  const signature = (document: VisualProjectDocument) => JSON.stringify({ audio: document.referenceAudio, durationMs: document.durationMs, clips: document.clips.map(({ id, text, startMs, endMs, words }) => ({ id, text, startMs, endMs, words })) });
  return signature(before) === signature(current);
}

export function applyAlignment(document: VisualProjectDocument, result: AlignmentResult): VisualProjectDocument {
  const source = alignmentLyrics(document);
  const byId = new Map(result.clips.map(clip => [clip.clipId, clip]));
  if (byId.size !== result.clips.length || source.length !== result.clips.length || source.some(clip => !byId.has(clip.id))) throw new Error('O resultado não corresponde aos slides da letra');
  return visualProjectSchema.parse({ ...document, durationMs: result.durationMs, clips: source.map(clip => {
    const timed = byId.get(clip.id)!;
    return { ...clip, startMs: timed.startMs, endMs: timed.endMs, words: timed.words };
  }) });
}
