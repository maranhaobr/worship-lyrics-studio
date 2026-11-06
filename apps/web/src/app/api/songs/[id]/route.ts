import { NextRequest,NextResponse } from 'next/server';
import { prisma } from '@wls/database';
import { getSong,updateSong } from '@/lib/song-data';
import { songSchema } from '@wls/shared';
export const runtime='nodejs';
type Ctx={params:Promise<{id:string}>};
export async function GET(_req:NextRequest,{params}:Ctx){try{const song=await getSong((await params).id);return song?NextResponse.json(song):NextResponse.json({error:'Música não encontrada'},{status:404});}catch{return NextResponse.json({error:'Erro interno'},{status:500});}}
export async function PUT(req:NextRequest,{params}:Ctx){let body:unknown;try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}const parsed=songSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:'Dados inválidos',details:parsed.error.flatten()},{status:422});try{const result=await updateSong((await params).id,parsed.data);return result?NextResponse.json(result):NextResponse.json({error:'Música não encontrada'},{status:404});}catch{return NextResponse.json({error:'Erro ao atualizar'},{status:500});}}
export async function DELETE(_req:NextRequest,{params}:Ctx){try{await prisma.song.delete({where:{id:(await params).id}});return new NextResponse(null,{status:204});}catch(e){if(typeof e==='object'&&e!==null&&'code' in e&&e.code==='P2025')return NextResponse.json({error:'Música não encontrada'},{status:404});return NextResponse.json({error:'Erro ao excluir'},{status:500});}}
