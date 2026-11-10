import { requireActor } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { listSongs, createSong } from '@/lib/song-data';
import { songSchema } from '@wls/shared';
import { apiResponse } from '@/lib/api-errors';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) { return apiResponse(async () => NextResponse.json(await listSongs(req.nextUrl.searchParams.get('q') ?? ''))); }
export async function POST(req: NextRequest) { return apiResponse(async () => { await requireActor('edit'); return NextResponse.json(await createSong(songSchema.parse(await req.json())), { status: 201 }); }); }
