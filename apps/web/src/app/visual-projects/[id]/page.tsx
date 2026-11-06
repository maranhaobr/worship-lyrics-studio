import { notFound } from 'next/navigation';
import { getVisualProject } from '@/lib/visual-project-data';
import { listVisualTemplates } from '@/lib/visual-template-data';
import { listMedia } from '@/lib/media-data';
import { getSong } from '@/lib/song-data';
import VisualEditor from '@/components/visual-editor/visual-editor';
export const dynamic = 'force-dynamic';
export default async function VisualProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const project = await getVisualProject((await params).id);
  if (!project) notFound();
  const [initialTemplates, sourceSong] = await Promise.all([listVisualTemplates(), project.songId ? getSong(project.songId) : null]);
  const backgrounds = [project.document.style.background, ...initialTemplates.map(template => template.style.background)];
  const initialAssets = await listMedia(backgrounds.flatMap(background => background.type === 'gradient' ? [] : [background.assetId]));
  return <VisualEditor key={project.id} project={project} initialTemplates={initialTemplates} initialAssets={initialAssets} sourceSong={sourceSong} />;
}
