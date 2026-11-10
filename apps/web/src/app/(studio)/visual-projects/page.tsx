import { requireActor } from '@/lib/auth/session';
import Link from 'next/link';
import { prisma } from '@wls/database';
export const dynamic = 'force-dynamic';
export default async function VisualProjectsPage() {
  const {churchId}=await requireActor();
  const projects = await prisma.visualProject.findMany({ where:{churchId}, orderBy: { updatedAt: 'desc' }, take: 100, select: { id: true, name: true, revision: true } });
  return <div className="space-y-6"><div className="flex items-center justify-between gap-4 flex-wrap"><h1 className="text-3xl font-bold">Projetos visuais</h1><div className="flex gap-3"><Link className="btn-secondary" href="/songs">Usar música salva</Link><Link className="btn" href="/visual-projects/new">Criar vídeo com letra</Link></div></div>
    <div className="grid md:grid-cols-2 gap-4">{projects.map(project => <Link className="card hover:border-accent" key={project.id} href={`/visual-projects/${project.id}`}><h2 className="font-bold">{project.name}</h2><p className="text-sm text-slate-400 mt-2">Revisão {project.revision}</p></Link>)}</div>
    {!projects.length && <p className="card text-slate-400">Envie a letra completa ou escolha uma música salva para criar seu primeiro vídeo.</p>}
  </div>;
}
