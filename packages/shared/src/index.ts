import { z } from 'zod';
export * from './visual';
export const sectionTypes = ['INTRO','VERSE','PRE_CHORUS','CHORUS','BRIDGE','OUTRO','CUSTOM'] as const;
export const lineSchema = z.object({ text: z.string().trim().min(1).max(500), startMs: z.number().int().nonnegative().nullable().optional(), endMs: z.number().int().nonnegative().nullable().optional() }).refine(x => x.startMs == null || x.endMs == null || x.endMs > x.startMs, 'End must be after start');
export const sectionSchema = z.object({ type: z.enum(sectionTypes), label: z.string().trim().min(1).max(100), lines: z.array(lineSchema).max(100) });
export const songSchema = z.object({ title: z.string().trim().min(1).max(200), artist: z.string().trim().max(200).nullable().optional(), key: z.string().trim().max(20).nullable().optional(), bpm: z.number().int().min(1).max(300).nullable().optional(), sections: z.array(sectionSchema).max(100).default([]) });
export type SongInput = z.infer<typeof songSchema>;
export const sectionLabels: Record<(typeof sectionTypes)[number],string> = {INTRO:'Introdução',VERSE:'Verso',PRE_CHORUS:'Pré-refrão',CHORUS:'Refrão',BRIDGE:'Ponte',OUTRO:'Final',CUSTOM:'Personalizado'};
