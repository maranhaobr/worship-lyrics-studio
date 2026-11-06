import { randomUUID } from 'node:crypto';
import { prisma } from '@wls/database';
import { ApiError } from './api-errors';
import { storeMedia, removeMedia } from './storage/local';
import type { MediaView } from '@wls/shared';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export async function listMedia(requiredIds: string[] = []): Promise<MediaView[]> {
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, name: true, kind: true, durationMs: true } });
  const missing = requiredIds.filter(id => !assets.some(asset => asset.id === id));
  const required = missing.length ? await prisma.mediaAsset.findMany({ where: { id: { in: missing } }, select: { id: true, name: true, kind: true, durationMs: true } }) : [];
  return [...assets, ...required].map(asset => ({ ...asset, kind: asset.kind === 'video' ? 'video' : 'image' }));
}
function identify(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { extension: 'png', mimeType: 'image/png', kind: 'image' };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { extension: 'jpg', mimeType: 'image/jpeg', kind: 'image' };
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return { extension: 'webp', mimeType: 'image/webp', kind: 'image' };
  if (bytes.toString('ascii', 4, 8) === 'ftyp' && /^(isom|iso[2-9]|mp4[12]|avc1|M4V |dash)/u.test(bytes.toString('ascii', 8, 12))) return { extension: 'mp4', mimeType: 'video/mp4', kind: 'video' };
  if (bytes.subarray(0, 4).equals(Buffer.from([26,69,223,163])) && bytes.subarray(0, 4096).includes(Buffer.from('webm'))) return { extension: 'webm', mimeType: 'video/webm', kind: 'video' };
  throw new ApiError(422, 'Formato não suportado. Use PNG, JPEG, WebP, MP4 ou WebM.');
}
export async function uploadMedia(file: File, duration: string | null) {
  if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, 'O arquivo deve ter até 50 MB');
  const bytes = Buffer.from(await file.arrayBuffer());
  const format = identify(bytes);
  const durationMs = format.kind === 'video' ? Number(duration) : null;
  if (format.kind === 'video' && (!Number.isInteger(durationMs) || durationMs! < 100 || durationMs! > 3_600_000)) throw new ApiError(422, 'Duração de vídeo inválida');
  const storageKey = `${randomUUID()}.${format.extension}`;
  await storeMedia(storageKey, bytes);
  try {
    return await prisma.mediaAsset.create({ data: { name: file.name.slice(0, 200), kind: format.kind, mimeType: format.mimeType, storageKey, size: bytes.length, durationMs }, select: { id: true, name: true, kind: true, durationMs: true } });
  } catch (error) { await removeMedia(storageKey); throw error; }
}
