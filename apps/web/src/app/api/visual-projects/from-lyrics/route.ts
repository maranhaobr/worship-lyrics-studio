import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@wls/database';
import { lyricsImportSchema, projectFromLyrics } from '@wls/shared';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { listVisualTemplates } from '@/lib/visual-template-data';
import { validateProjectMedia } from '@/lib/visual-project-data';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  return apiResponse(async () => {
    const input = lyricsImportSchema.parse(await req.json());
    const template = (await listVisualTemplates()).find(item => item.id === input.templateId);
    if (!template) throw new ApiError(422, 'Template não encontrado');
    let document;
    try { document = projectFromLyrics(input, randomUUID, template.style); }
    catch { throw new ApiError(422, 'Não foi possível organizar a letra. Envie frases de até 500 caracteres e um vídeo de até uma hora.'); }
    await validateProjectMedia(document);
    return NextResponse.json(await prisma.visualProject.create({ data: { name: input.title, document }, select: { id: true } }), { status: 201 });
  });
}
