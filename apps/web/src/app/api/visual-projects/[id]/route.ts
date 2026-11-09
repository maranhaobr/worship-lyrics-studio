import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { getVisualProject, updateVisualProject } from '@/lib/visual-project-data';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: Context) {
  return apiResponse(async () => {
    const project = await getVisualProject((await params).id);
    if (!project) throw new ApiError(404, 'Projeto não encontrado');
    return NextResponse.json(project);
  });
}
export async function PUT(req: NextRequest, { params }: Context) {
  return apiResponse(async () => NextResponse.json(await updateVisualProject((await params).id, await req.json())));
}
