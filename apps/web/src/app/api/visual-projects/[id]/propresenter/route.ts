import { apiResponse, ApiError } from '@/lib/api-errors';
import { getVisualProject } from '@/lib/visual-project-data';
import { visualProjectSchema } from '@wls/shared';
import { visualProjectSong } from '@/lib/propresenter';
import { proPresenterResponse } from '@/lib/propresenter/response';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiResponse(async () => {
    const project = await getVisualProject((await params).id);
    if (!project) throw new ApiError(404, 'Projeto não encontrado');
    const document = visualProjectSchema.parse(await request.json());
    try { return proPresenterResponse(visualProjectSong(project.name, document)); }
    catch (error) { throw new ApiError(422, error instanceof Error ? error.message : 'Não foi possível exportar'); }
  });
}
