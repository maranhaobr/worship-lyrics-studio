import { requireActor } from '@/lib/auth/session';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { getSong } from '@/lib/song-data';
import { proPresenterResponse } from '@/lib/propresenter/response';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiResponse(async () => {
    await requireActor('read');
    const song = await getSong((await params).id);
    if (!song) throw new ApiError(404, 'Música não encontrada');
    try { return proPresenterResponse(song); }
    catch (error) { throw new ApiError(422, error instanceof Error ? error.message : 'Não foi possível exportar'); }
  });
}
