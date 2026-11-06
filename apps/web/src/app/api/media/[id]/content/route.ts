import { NextRequest } from 'next/server';
import { prisma } from '@wls/database';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { readMedia } from '@/lib/storage/local';
export const runtime = 'nodejs';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiResponse(async () => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: (await params).id } });
    if (!asset) throw new ApiError(404, 'Mídia não encontrada');
    let bytes: Buffer;
    try { bytes = await readMedia(asset.storageKey); } catch { throw new ApiError(404, 'Arquivo não encontrado'); }
    const headers = { 'Content-Type': asset.mimeType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' };
    const range = req.headers.get('range');
    if (!range) return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Length': String(bytes.length) } });
    const match = /^bytes=(\d*)-(\d*)$/u.exec(range);
    const start = match?.[1] ? Number(match[1]) : match?.[2] ? Math.max(0, bytes.length - Number(match[2])) : NaN;
    const end = match?.[1] && match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= bytes.length || end < start) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } });
    return new Response(new Uint8Array(bytes.subarray(start, end + 1)), { status: 206, headers: { ...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${bytes.length}` } });
  });
}
