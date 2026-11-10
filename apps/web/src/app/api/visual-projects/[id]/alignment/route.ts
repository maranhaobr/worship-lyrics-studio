import { requireActor } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@wls/database';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { enqueueAlignment, getAlignmentJob, applyAlignmentJob } from '@/lib/alignment-data';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: Context) {
  return apiResponse(async () => {
    const {churchId}=await requireActor('read');
    const id = (await params).id;
    if (!await prisma.visualProject.findFirst({ where: { id, churchId }, select: { id: true } })) throw new ApiError(404, 'Projeto não encontrado');
    return NextResponse.json(await getAlignmentJob(id));
  });
}
export async function POST(req: NextRequest, { params }: Context) {
  return apiResponse(async () => {
    const {churchId}=await requireActor('edit');
    const { revision } = z.object({ revision: z.number().int().positive() }).parse(await req.json());
    return NextResponse.json(await enqueueAlignment((await params).id, revision), { status: 202 });
  });
}
export async function PUT(req: NextRequest, { params }: Context) {
  return apiResponse(async () => {
    const {churchId}=await requireActor('edit');
    const { revision, jobId } = z.object({ revision: z.number().int().positive(), jobId: z.string().min(1) }).parse(await req.json());
    return NextResponse.json(await applyAlignmentJob((await params).id, jobId, revision));
  });
}
export async function DELETE(req: NextRequest, { params }: Context) {
  return apiResponse(async () => {
    const {churchId}=await requireActor('edit');
    const { jobId } = z.object({ jobId: z.string().min(1) }).parse(await req.json());
    const result = await prisma.alignmentJob.updateMany({ where: { id: jobId, projectId: (await params).id, project:{churchId}, status: { in: ['QUEUED', 'PROCESSING'] } }, data: { status: 'CANCELLED' } });
    if (!result.count) throw new ApiError(409, 'Este alinhamento já terminou');
    return NextResponse.json({ cancelled: true });
  });
}
