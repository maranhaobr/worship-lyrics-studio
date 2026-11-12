import { requireActor } from '@/lib/auth/session';
import Link from 'next/link';
import { prisma } from '@wls/database';
import { can } from '@wls/shared';
import { ArrowRight, ArrowUpRight, AudioLines, Clapperboard, FileText, Library, Music2, Plus, Sparkles, Users, Upload } from 'lucide-react';
import { ProjectCard } from '@/components/project-card';
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const { churchId, user, role } = await requireActor();
  const canEdit = can(role, 'edit');
  const [songs, sections, projects, members, recent] = await Promise.all([
    prisma.song.count({ where: { churchId } }),
    prisma.songSection.count({ where: { song: { churchId } } }),
    prisma.visualProject.count({ where: { churchId } }),
    prisma.membership.count({ where: { churchId } }),
    prisma.visualProject.findMany({ where: { churchId }, orderBy: { updatedAt: 'desc' }, take: 3, select: { id: true, name: true, document: true, revision: true, updatedAt: true } }),
  ]);
  return <div className="studio-dashboard">
    <header className="studio-page-title"><div><span className="studio-eyebrow">SEU ESPAÇO CRIATIVO</span><h1>Bom ter você aqui, {user.name.trim().split(/\s+/u)[0]}.</h1><p>Uma nova oportunidade de dar vida à mensagem.</p></div>{canEdit && <Link href="/visual-projects/new" className="btn"><Plus size={16} /> Criar lyric video</Link>}</header>
    <section className="studio-welcome"><div><span className="studio-eyebrow">CRIATIVIDADE COM PROPÓSITO</span><h2>Da letra à tela.<br /><em>Com a identidade da sua igreja.</em></h2><p>Escolha um visual, personalize cada frase e prepare o próximo lyric video do seu ministério.</p><Link href={canEdit ? '/visual-projects/new' : '/visual-projects'} className="btn"><Sparkles size={14} />{canEdit ? 'Começar um projeto' : 'Explorar projetos'}<ArrowRight size={14} /></Link></div><div className="studio-welcome-art" aria-hidden="true"><div className="studio-welcome-orbit" /><div><AudioLines /><span>Uma só voz.<br />Um só propósito.</span><small>WORSHIP LYRICS STUDIO</small></div></div></section>
    <section className="studio-stats" aria-label="Resumo da igreja">{[
      { label: 'Músicas na biblioteca', value: songs, Icon: Music2 }, { label: 'Projetos visuais', value: projects, Icon: Clapperboard }, { label: 'Seções organizadas', value: sections, Icon: FileText }, { label: 'Pessoas na equipe', value: members, Icon: Users },
    ].map(({ label, value, Icon }) => <article className="studio-stat" key={label}><span className="studio-stat-icon"><Icon size={20} /></span><div><strong>{new Intl.NumberFormat('pt-BR').format(value)}</strong><small>{label}</small></div></article>)}</section>
    <section><div className="studio-section-head"><div><h2>Continue de onde parou</h2><p>Os projetos atualizados mais recentemente pela sua equipe.</p></div><Link href="/visual-projects">Ver todos <ArrowRight size={14} /></Link></div>
      {recent.length ? <div className="studio-project-grid">{recent.map(project => <ProjectCard project={project} key={project.id} />)}</div> : <div className="studio-empty"><Clapperboard size={28} /><h2>Sua próxima criação começa aqui</h2><p>{canEdit ? 'Traga uma letra, escolha um template e crie o primeiro projeto visual da sua igreja.' : 'Os projetos da sua equipe aparecerão aqui assim que forem criados.'}</p>{canEdit && <Link href="/visual-projects/new" className="btn">Criar primeiro projeto <ArrowRight size={14} /></Link>}</div>}
    </section>
    <section className="studio-quick-grid" aria-label="Atalhos do workspace"><Link className="studio-quick" href="/songs"><Library /><div><h3>Sua biblioteca de louvor</h3><p>Reúna as letras e mantenha o repertório organizado.</p></div><ArrowUpRight /></Link>{canEdit && <Link className="studio-quick" href="/songs/import"><Upload /><div><h3>Traga do ProPresenter</h3><p>Importe músicas e continue criando no Studio.</p></div><ArrowUpRight /></Link>}<Link className="studio-quick" href="/church"><Users /><div><h3>Crie em comunidade</h3><p>Veja a equipe e os acessos da sua igreja.</p></div><ArrowUpRight /></Link></section>
  </div>;
}