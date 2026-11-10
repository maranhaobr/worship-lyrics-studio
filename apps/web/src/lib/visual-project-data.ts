import { requireActor } from './auth/session';
import { randomUUID } from 'node:crypto';
import { prisma } from '@wls/database';
import { projectBackgrounds, projectFromSong, projectUpdateSchema, visualProjectSchema, type ProjectView, type VisualStyle, type VisualProjectDocument } from '@wls/shared';
import { getSong } from './song-data';
import { ApiError } from './api-errors';

export async function validateMedia(style: VisualStyle) {
  const {churchId}=await requireActor('read');
  if (style.background.type === 'gradient') return;
  const asset = await prisma.mediaAsset.findFirst({ where: { id: style.background.assetId, churchId } });
  if (!asset || asset.kind !== style.background.type) throw new ApiError(422, 'O fundo selecionado não está disponível');
}
export async function createVisualProject(songId: string) {
  const {churchId}=await requireActor('edit');
  const song = await getSong(songId);
  if (!song) throw new ApiError(404, 'Música não encontrada');
  const document = visualProjectSchema.parse(projectFromSong(song, randomUUID));
  return prisma.visualProject.create({ data: { churchId, songId, name: song.title, document }, select: { id: true } });
}
export async function validateProjectMedia(document: VisualProjectDocument) {
  const {churchId}=await requireActor('read');
  if (document.referenceAudio) {
    const audio = await prisma.mediaAsset.findFirst({ where: { id: document.referenceAudio.assetId, churchId }, select: { kind: true } });
    if (audio?.kind !== 'audio') throw new ApiError(422, 'Áudio de referência não encontrado');
  }
  const backgrounds = projectBackgrounds(document).filter(background => background.type !== 'gradient');
  if (!backgrounds.length) return;
  const assets = await prisma.mediaAsset.findMany({ where: { churchId, id: { in: backgrounds.map(background => background.assetId) } }, select: { id: true, kind: true } });
  if (backgrounds.some(background => !assets.some(asset => asset.id === background.assetId && asset.kind === background.type))) throw new ApiError(422, 'Um fundo do projeto não está disponível');
}
export async function getVisualProject(id: string): Promise<ProjectView | null> {
  const {churchId}=await requireActor('read');
  const project = await prisma.visualProject.findFirst({ where: { id, churchId } });
  return project ? { id: project.id, songId: project.songId, name: project.name, revision: project.revision, document: visualProjectSchema.parse(project.document) } : null;
}
export async function updateVisualProject(id: string, body: unknown) {
  const {churchId}=await requireActor('edit');
  const data = projectUpdateSchema.parse(body);
  await validateProjectMedia(data.document);
  const result = await prisma.visualProject.updateMany({
    where: { id, churchId, revision: data.revision },
    data: { name: data.name, document: data.document, revision: { increment: 1 } },
  });
  if (!result.count) {
    const exists = await prisma.visualProject.findFirst({ where: { id, churchId }, select: { id: true } });
    throw new ApiError(exists ? 409 : 404, exists ? 'O projeto foi alterado em outra aba. Recarregue antes de salvar.' : 'Projeto não encontrado');
  }
  return { revision: data.revision + 1 };
}
