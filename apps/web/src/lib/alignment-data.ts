import { prisma, Prisma } from '@wls/database';
import { alignmentInputMatches, alignmentJobSchema, alignmentLyrics, alignmentResultSchema, applyAlignment, visualProjectSchema } from '@wls/shared';
import { ApiError } from './api-errors';
import { z } from 'zod';

export async function getAlignmentJob(projectId: string) {
  const [job, worker] = await Promise.all([
    prisma.alignmentJob.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
    prisma.alignmentWorker.findFirst({ where: { updatedAt: { gt: new Date(Date.now() - 60000) } }, select: { id: true } }),
  ]);
  return job ? alignmentJobSchema.parse({ ...job, workerOnline: Boolean(worker), result: job.result }) : null;
}
export async function enqueueAlignment(projectId: string, revision: number) {
  return prisma.$transaction(async tx => {
    const project = await tx.visualProject.findUnique({ where: { id: projectId } });
    if (!project) throw new ApiError(404, 'Projeto não encontrado');
    if (project.revision !== revision) throw new ApiError(409, 'O projeto foi alterado. Recarregue antes de sincronizar.');
    const document = visualProjectSchema.parse(project.document);
    if (!alignmentLyrics(document).length) throw new ApiError(422, 'Adicione letras ao projeto antes de sincronizar');
    if (!document.referenceAudio) throw new ApiError(422, 'Selecione e salve um áudio de referência');
    const audio = await tx.mediaAsset.findUnique({ where: { id: document.referenceAudio.assetId } });
    if (audio?.kind !== 'audio') throw new ApiError(422, 'Áudio de referência não encontrado');
    const active = await tx.alignmentJob.findFirst({ where: { projectId, status: { in: ['QUEUED', 'PROCESSING'] } } });
    if (active) return { id: active.id };
    try {
      return await tx.alignmentJob.create({ data: { projectId, audioAssetId: audio.id, document: { document, clips: alignmentLyrics(document).map(({ id, text }) => ({ id, text })) } }, select: { id: true } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError(409, 'Este projeto já está na fila de alinhamento');
      throw error;
    }
  });
}
export async function applyAlignmentJob(projectId: string, jobId: string, revision: number) {
  return prisma.$transaction(async tx => {
    const project = await tx.visualProject.findUnique({ where: { id: projectId } });
    const job = await tx.alignmentJob.findFirst({ where: { id: jobId, projectId, status: 'COMPLETED' } });
    if (!project || !job) throw new ApiError(404, 'Resultado de alinhamento não encontrado');
    if (project.revision !== revision) throw new ApiError(409, 'O projeto foi alterado em outra aba. Recarregue antes de aplicar.');
    const document = visualProjectSchema.parse(project.document);
    const input = z.object({ document: visualProjectSchema }).parse(job.document).document;
    if (!alignmentInputMatches(input, document)) throw new ApiError(409, 'A letra, o áudio ou os tempos foram editados após iniciar o alinhamento. Inicie uma nova sincronização.');
    let aligned;
    try { aligned = applyAlignment(document, alignmentResultSchema.parse(job.result)); }
    catch { throw new ApiError(422, 'O resultado precisa ser revisado. Confira se a letra corresponde à gravação e tente novamente.'); }
    const claimed = await tx.alignmentJob.updateMany({ where: { id: jobId, status: 'COMPLETED' }, data: { status: 'APPLIED' } });
    if (!claimed.count) throw new ApiError(409, 'Este resultado já foi aplicado');
    const updated = await tx.visualProject.updateMany({ where: { id: projectId, revision }, data: { document: aligned, revision: { increment: 1 } } });
    if (!updated.count) throw new ApiError(409, 'O projeto foi alterado durante a aplicação. Recarregue a página.');
    return { id: project.id, songId: project.songId, name: project.name, revision: revision + 1, document: aligned };
  });
}
