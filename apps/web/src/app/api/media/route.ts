import { requireActor } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { listMedia, uploadMedia, MAX_UPLOAD_BYTES } from '@/lib/media-data';
export const runtime = 'nodejs';
export async function GET() { return apiResponse(async () => NextResponse.json(await listMedia())); }
export async function POST(req: NextRequest) {
  return apiResponse(async () => {
    const {churchId}=await requireActor('edit');
    if (Number(req.headers.get('content-length')) > MAX_UPLOAD_BYTES + 64 * 1024) throw new ApiError(413, 'O arquivo deve ter até 50 MB');
    const data = await req.formData();
    const file = data.get('file');
    if (!(file instanceof File)) throw new ApiError(400, 'Selecione um arquivo');
    return NextResponse.json(await uploadMedia(file, typeof data.get('durationMs') === 'string' ? String(data.get('durationMs')) : null), { status: 201 });
  });
}
