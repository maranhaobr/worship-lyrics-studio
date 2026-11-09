import { randomUUID } from 'node:crypto';
import { prisma } from '@wls/database';
import { projectBackgrounds, projectFromSong, projectUpdateSchema, visualProjectSchema, type ProjectView, type VisualStyle, type VisualProjectDocument } from '@wls/shared';
import { getSong } from './song-data';
import { ApiError } from './api-errors';

export async function validateMedia(style: VisualStyle) {
  if (style.background.type === 'gradient') return;
  const asset = await prisma.mediaAsset.findUnique({ where: { id: style.background.assetId } });
  if (!asset || asset.kind !== style.background.type) throw new ApiError(422, 'O fundo selecionado não está disponível');
}
export async function createVisualProject(songId: string) {
  const song = await getSong(songId);
  if (!song) throw new ApiError(404, 'Música não encontrada');
  const document = visualProjectSchema.parse(projectFromSong(song, randomUUID));
  return prisma.visualProject.create({ data: { songId, name: song.title, document }, select: { id: true } });
}
export async function validateProjectMedia(document: VisualProjectDocument) {
  if (document.referenceAudio) {
    const audio = await prisma.mediaAsset.findUnique({ where: { id: document.referenceAudio.assetId }, select: { kind: true } });
    if (audio?.kind !== 'audio') throw new ApiError(422, 'Áudio de referência não encontrado');
  }
  const backgrounds = projectBackgrounds(document).filter(background => background.type !== 'gradient');
  if (!backgrounds.length) return;
  const assets = await prisma.mediaAsset.findMany({ where: { id: { in: backgrounds.map(background => background.assetId) } }, select: { id: true, kind: true } });
  if (backgrounds.some(background => !assets.some(asset => asset.id === background.assetId && asset.kind === background.type))) throw new ApiError(422, 'Um fundo do projeto não está disponível');
}
export async function getVisualProject(id: string): Promise<ProjectView | null> {
  const project = await prisma.visualProject.findUnique({ where: { id } });
  return project ? { id: project.id, songId: project.songId, name: project.name, revision: project.revision, document: visualProjectSchema.parse(project.document) } : null;
}
export async function updateVisualProject(id: string, body: unknown) {
  const data = projectUpdateSchema.parse(body);
  await validateProjectMedia(data.document);
  const result = await prisma.visualProject.updateMany({
    where: { id, revision: data.revision },
    data: { name: data.name, document: data.document, revision: { increment: 1 } },
  });
  if (!result.count) {
    const exists = await prisma.visualProject.findUnique({ where: { id }, select: { id: true } });
    throw new ApiError(exists ? 409 : 404, exists ? 'O projeto foi alterado em outra aba. Recarregue antes de salvar.' : 'Projeto não encontrado');
  }
  return { revision: data.revision + 1 };
}
