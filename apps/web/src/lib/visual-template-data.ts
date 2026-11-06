import { prisma } from '@wls/database';
import { templateInputSchema, templatePresets, visualStyleSchema, type TemplatePreset } from '@wls/shared';
import { validateMedia } from './visual-project-data';
import { ApiError } from './api-errors';

export async function listVisualTemplates(): Promise<TemplatePreset[]> {
  const templates = await prisma.visualTemplate.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 });
  return [...templatePresets, ...templates.map(template => ({ id: template.id, name: template.name, style: visualStyleSchema.parse(template.style) }))];
}
export async function saveVisualTemplate(body: unknown, id?: string) {
  const data = templateInputSchema.parse(body);
  await validateMedia(data.style);
  if (!id) return prisma.visualTemplate.create({ data, select: { id: true, name: true, style: true } });
  const result = await prisma.visualTemplate.updateMany({ where: { id }, data });
  if (!result.count) throw new ApiError(404, 'Template não encontrado');
  return { id, ...data };
}
