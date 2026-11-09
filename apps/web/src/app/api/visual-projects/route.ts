import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@wls/database';
import { apiResponse } from '@/lib/api-errors';
import { createVisualProject } from '@/lib/visual-project-data';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  return apiResponse(async () => NextResponse.json(await prisma.visualProject.findMany({
    where: req.nextUrl.searchParams.get('songId') ? { songId: req.nextUrl.searchParams.get('songId')! } : {},
    orderBy: { updatedAt: 'desc' }, take: 100,
    select: { id: true, songId: true, name: true, revision: true, updatedAt: true },
  })));
}
export async function POST(req: NextRequest) {
  return apiResponse(async () => {
    const { songId } = z.object({ songId: z.string().min(1) }).parse(await req.json());
    return NextResponse.json(await createVisualProject(songId), { status: 201 });
  });
}
