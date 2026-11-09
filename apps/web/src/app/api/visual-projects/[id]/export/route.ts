import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { NextRequest } from 'next/server';
import { prisma } from '@wls/database';
import { visualProjectSchema } from '@wls/shared';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { renderProjectVideo } from '@/lib/render-video';
export const runtime = 'nodejs';
export const maxDuration = 3600;
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiResponse(async () => {
    const { id } = await params;
    const project = await prisma.visualProject.findUnique({ where: { id }, select: { id: true } });
    if (!project) throw new ApiError(404, 'Projeto não encontrado');
    const document = visualProjectSchema.parse(await req.json());
    const result = await renderProjectVideo(document);
    try {
      const { size } = await stat(result.path);
      const file = createReadStream(result.path);
      file.once('close', () => { void result.dispose().catch(console.error); });
      return new Response(Readable.toWeb(file) as ReadableStream<Uint8Array>, { headers: {
        'Content-Type': 'video/mp4', 'Content-Length': String(size),
        'Content-Disposition': `attachment; filename="worship-${id}.mp4"`, 'Cache-Control': 'no-store',
      } });
    } catch (error) { await result.dispose(); throw error; }
  });
}
