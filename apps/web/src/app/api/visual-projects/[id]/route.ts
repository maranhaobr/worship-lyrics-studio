import { requireActor } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { getVisualProject, updateVisualProject, deleteVisualProject } from '@/lib/visual-project-data';
import { z } from 'zod';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: Context) {
  return apiResponse(async () => {
    const {churchId}=await requireActor('read');
    const project = await getVisualProject((await params).id);
    if (!project) throw new ApiError(404, 'Projeto não encontrado');
    return NextResponse.json(project);
  });
}
export async function PUT(req: NextRequest, { params }: Context) {
  return apiResponse(async () => { await requireActor('edit'); return NextResponse.json(await updateVisualProject((await params).id, await req.json())); });
}
export async function DELETE(req: NextRequest, { params }: Context) {
  return apiResponse(async () => {
    await requireActor('delete');
    const { revision } = z.object({ revision: z.number().int().positive() }).strict().parse(await req.json());
    await deleteVisualProject((await params).id, revision);
    return NextResponse.json({ deleted: true });
  });
}
