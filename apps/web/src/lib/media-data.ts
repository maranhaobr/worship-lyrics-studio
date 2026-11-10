import { requireActor } from './auth/session';
import { randomUUID } from 'node:crypto';
import { prisma } from '@wls/database';
import { ApiError } from './api-errors';
import { storeMedia, removeMedia, mediaPath } from './storage/local';
import { RenderInternals } from '@remotion/renderer';
import type { MediaView } from '@wls/shared';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export async function listMedia(requiredIds: string[] = []): Promise<MediaView[]> {
  const {churchId}=await requireActor();
  const assets = await prisma.mediaAsset.findMany({ where:{churchId}, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, name: true, kind: true, durationMs: true } });
  const missing = requiredIds.filter(id => !assets.some(asset => asset.id === id));
  const required = missing.length ? await prisma.mediaAsset.findMany({ where: { churchId, id: { in: missing } }, select: { id: true, name: true, kind: true, durationMs: true } }) : [];
  return [...assets, ...required].map(asset => ({ ...asset, kind: asset.kind === 'audio' ? 'audio' : asset.kind === 'video' ? 'video' : 'image' }));
}
function identify(bytes: Buffer, audioContainer = false) {
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE') return { extension: 'wav', mimeType: 'audio/wav', kind: 'audio' };
  if (bytes.toString('ascii', 0, 3) === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224 && (bytes[1] & 6) !== 0)) return { extension: 'mp3', mimeType: 'audio/mpeg', kind: 'audio' };
  if (bytes.toString('ascii', 4, 8) === 'ftyp' && bytes.toString('ascii', 8, 12) === 'M4A ') return { extension: 'm4a', mimeType: 'audio/mp4', kind: 'audio' };
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { extension: 'png', mimeType: 'image/png', kind: 'image' };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { extension: 'jpg', mimeType: 'image/jpeg', kind: 'image' };
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return { extension: 'webp', mimeType: 'image/webp', kind: 'image' };
  if (bytes.toString('ascii', 4, 8) === 'ftyp' && /^(isom|iso[2-9]|mp4[12]|avc1|M4V |dash)/u.test(bytes.toString('ascii', 8, 12))) return audioContainer ? { extension: 'm4a', mimeType: 'audio/mp4', kind: 'audio' } : { extension: 'mp4', mimeType: 'video/mp4', kind: 'video' };
  if (bytes.subarray(0, 4).equals(Buffer.from([26,69,223,163])) && bytes.subarray(0, 4096).includes(Buffer.from('webm'))) return { extension: 'webm', mimeType: 'video/webm', kind: 'video' };
  throw new ApiError(422, 'Formato não suportado. Use PNG, JPEG, WebP, MP4, WebM, MP3, WAV ou M4A.');
}
export async function uploadMedia(file: File, duration: string | null) {
  const {churchId}=await requireActor('edit');
  if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, 'O arquivo deve ter até 50 MB');
  const bytes = Buffer.from(await file.arrayBuffer());
  const format = identify(bytes, /\.m4a$/iu.test(file.name) || file.type === 'audio/mp4');
  let durationMs = format.kind === 'video' ? Number(duration) : null;
  if (format.kind === 'video' && (!Number.isInteger(durationMs) || durationMs! < 100 || durationMs! > 3_600_000)) throw new ApiError(422, 'Duração de vídeo inválida');
  const storageKey = `${randomUUID()}.${format.extension}`;
  await storeMedia(storageKey, bytes);
  try {
    if (format.kind === 'audio') {
      try {
        const probe = await RenderInternals.callFf({ bin: 'ffprobe', args: ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', mediaPath(storageKey)], indent: false, logLevel: 'error', binariesDirectory: null, cancelSignal: undefined });
        const info = JSON.parse(probe.stdout) as { format?: { duration?: string }; streams?: { codec_type: string }[] };
        durationMs = Math.round(Number(info.format?.duration) * 1000);
        if (!info.streams?.some(stream => stream.codec_type === 'audio') || info.streams.some(stream => stream.codec_type === 'video') || !Number.isFinite(durationMs) || durationMs < 100 || durationMs > 3_600_000) throw new Error('Invalid audio');
      } catch { throw new ApiError(422, 'Áudio inválido. Envie MP3, WAV ou M4A com duração de até uma hora.'); }
    }
    return await prisma.mediaAsset.create({ data: { churchId, name: file.name.slice(0, 200), kind: format.kind, mimeType: format.mimeType, storageKey, size: bytes.length, durationMs }, select: { id: true, name: true, kind: true, durationMs: true } });
  } catch (error) { await removeMedia(storageKey); throw error; }
}
