import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@wls/database';
import { getSong, updateSong } from '@/lib/song-data';
import { songSchema } from '@wls/shared';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { requireActor } from '@/lib/auth/session';
export const runtime = 'nodejs';
type Context = { params: Promise<{id: string}> };
export async function GET(_req: NextRequest, {params}: Context) { return apiResponse(async () => {
    const {churchId}=await requireActor('read'); const song=await getSong((await params).id); if(!song) throw new ApiError(404,'Música não encontrada'); return NextResponse.json(song); }); }
export async function PUT(req: NextRequest, {params}: Context) { return apiResponse(async () => {
    const {churchId}=await requireActor('edit'); await requireActor('edit'); const song=await updateSong((await params).id,songSchema.parse(await req.json())); if(!song) throw new ApiError(404,'Música não encontrada'); return NextResponse.json(song); }); }
export async function DELETE(_req: NextRequest, {params}: Context) { return apiResponse(async () => {
    const {churchId}=await requireActor('delete'); const result=await prisma.song.deleteMany({where:{id:(await params).id,churchId}}); if(!result.count)throw new ApiError(404,'Música não encontrada'); return new NextResponse(null,{status:204}); }); }
