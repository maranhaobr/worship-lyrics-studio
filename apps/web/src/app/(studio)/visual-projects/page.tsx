import { requireActor } from '@/lib/auth/session';
import Link from 'next/link';
import { prisma } from '@wls/database';
import { can } from '@wls/shared';
import { ArrowRight, Clapperboard, Library, Plus } from 'lucide-react';
import { ProjectCard } from '@/components/project-card';
export const dynamic = 'force-dynamic';
export default async function VisualProjectsPage() {
  const { churchId, role } = await requireActor();
  const canEdit = can(role, 'edit');
  const projects = await prisma.visualProject.findMany({ where: { churchId }, orderBy: { updatedAt: 'desc' }, take: 100, select: { id: true, name: true, document: true, revision: true, updatedAt: true } });
  return <div><header className="studio-page-title"><div><span className="studio-eyebrow">DA LETRA À TELA</span><h1>Projetos visuais</h1><p>Suas ideias, seus visuais e os próximos vídeos da igreja.</p></div><div className="studio-page-actions"><Link className="btn-secondary" href="/songs"><Library size={14} /> Usar música salva</Link>{canEdit && <Link className="btn" href="/visual-projects/new"><Plus size={15} /> Criar vídeo com letra</Link>}</div></header>
    {projects.length > 0 && <div className="studio-section-head"><p>{projects.length} {projects.length === 1 ? 'projeto' : 'projetos'} · Mais recentes primeiro</p></div>}
    {projects.length ? <div className="studio-project-grid">{projects.map(project => <ProjectCard project={project} key={project.id} />)}</div> : <div className="studio-empty"><Clapperboard size={30} /><h2>A primeira ideia merece ganhar vida</h2><p>Envie a letra completa ou escolha uma música da biblioteca para começar um projeto visual.</p>{canEdit && <Link className="btn" href="/visual-projects/new">Criar primeiro vídeo <ArrowRight size={14} /></Link>}</div>}
  </div>;
}