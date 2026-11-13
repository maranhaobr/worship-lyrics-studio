import { z } from 'zod';

export const resolutionPresets = [
  { id: 'projector', label: 'Projetor XGA · 4:3', width: 1024, height: 768 },
  { id: 'hd', label: 'HD · 16:9', width: 1280, height: 720 },
  { id: 'full-hd', label: 'Full HD · 16:9', width: 1920, height: 1080 },
  { id: 'qhd', label: 'QHD · 16:9', width: 2560, height: 1440 },
  { id: '4k', label: '4K UHD · 16:9', width: 3840, height: 2160 },
  { id: 'vertical', label: 'Vertical · 9:16', width: 1080, height: 1920 },
  { id: 'square', label: 'Quadrado · 1:1', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Retrato · 4:5', width: 1080, height: 1350 },
] as const;

// H.264 with yuv420p requires even dimensions. Bound memory use per frame.
export const videoDimensionSchema = z.number().int('Use pixels inteiros').min(256, 'O mínimo é 256 pixels').max(4096, 'O máximo é 4096 pixels').multipleOf(2, 'Use um número par de pixels');
export const maxVideoPixels = 3840 * 2160;
export const videoResolutionSchema = z.object({ width: videoDimensionSchema, height: videoDimensionSchema }).refine(
  size => size.width * size.height <= maxVideoPixels,
  { message: 'A resolução deve ter no máximo 8.294.400 pixels (4K UHD)', path: ['width'] },
);
