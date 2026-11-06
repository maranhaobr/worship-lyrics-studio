import { NextRequest,NextResponse } from 'next/server';
import { listSongs,createSong } from '@/lib/song-data';
import { songSchema } from '@wls/shared';
export const runtime='nodejs';
export async function GET(req:NextRequest){try{return NextResponse.json(await listSongs(req.nextUrl.searchParams.get('q')??''));}catch{return NextResponse.json({error:'Falha ao listar músicas'},{status:500});}}
export async function POST(req:NextRequest){let body:unknown;try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}const parsed=songSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:'Dados inválidos',details:parsed.error.flatten()},{status:422});try{return NextResponse.json(await createSong(parsed.data),{status:201});}catch{return NextResponse.json({error:'Falha ao salvar música'},{status:500});}}
