import Link from 'next/link';
import { ArrowUpRight, Clapperboard, Clock3 } from 'lucide-react';
import { visualProjectSchema } from '@wls/shared';

export function ProjectCard({ project }: { project: { id: string; name: string; revision: number; document: unknown; updatedAt: Date } }) {
  const parsed = visualProjectSchema.safeParse(project.document);
  const doc = parsed.success ? parsed.data : null;
  const background = doc?.style.background;
  const gradient = background?.type === 'gradient' ? `linear-gradient(${background.angle}deg,${background.from},${background.to})` : 'linear-gradient(140deg,#183651,#283c6d)';
  const image = background?.type === 'image' ? `linear-gradient(#0004,#0004),url(/api/media/${encodeURIComponent(background.assetId)}/content)` : gradient;
  return <Link href={`/visual-projects/${project.id}`} className="studio-project-card">
    <div className="studio-project-cover" style={{ backgroundImage: image, color: doc?.style.text.color ?? '#ffffff' }}><span className="studio-project-format">{doc ? `${doc.width} × ${doc.height}` : 'PROJETO VISUAL'}</span><p style={{ fontFamily: doc?.style.text.fontFamily }}>{doc?.clips[0]?.text ?? project.name}</p><span className="studio-project-open"><ArrowUpRight size={19} /></span><span className="studio-project-duration"><Clock3 size={11} />{doc ? `${Math.floor(doc.durationMs / 60000)}:${String(Math.floor(doc.durationMs / 1000) % 60).padStart(2, '0')}` : '—'}</span></div>
    <div className="studio-project-info"><h3>{project.name}</h3><p><span><Clapperboard size={12} /> Revisão {project.revision}</span><time dateTime={project.updatedAt.toISOString()}>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(project.updatedAt)}</time></p></div>
  </Link>;
}
