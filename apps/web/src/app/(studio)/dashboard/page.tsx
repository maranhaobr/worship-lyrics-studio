import { getTranslator } from '@/lib/i18n/server';
import { requireActor } from '@/lib/auth/session';
import Link from 'next/link';
import { prisma } from '@wls/database';
import { can } from '@wls/shared';
import { ArrowRight, ArrowUpRight, AudioLines, Clapperboard, FileText, Library, Music2, Plus, Sparkles, Users, Upload } from 'lucide-react';
import { ProjectCard } from '@/components/project-card';
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const t = await getTranslator();
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
    <header className="studio-page-title"><div><span className="studio-eyebrow">{t("SEU ESPAÇO CRIATIVO")}</span><h1>{t("Bom ter você aqui, ")}{user.name.trim().split(/\s+/u)[0]}.</h1><p>{t("Uma nova oportunidade de dar vida à mensagem.")}</p></div>{canEdit && <Link href="/visual-projects/new" className="btn"><Plus size={16} />{t(" Criar lyric video")}</Link>}</header>
    <section className="studio-welcome"><div><span className="studio-eyebrow">{t("CRIATIVIDADE COM PROPÓSITO")}</span><h2>{t("Da letra à tela.")}<br /><em>{t("Com a identidade da sua igreja.")}</em></h2><p>{t("Escolha um visual, personalize cada frase e prepare o próximo lyric video do seu ministério.")}</p><Link href={canEdit ? '/visual-projects/new' : '/visual-projects'} className="btn"><Sparkles size={14} />{canEdit ? t('Começar um projeto') : t('Explorar projetos')}<ArrowRight size={14} /></Link></div><div className="studio-welcome-art" aria-hidden="true"><div className="studio-welcome-orbit" /><div><AudioLines /><span>{t("Uma só voz.")}<br />{t("Um só propósito.")}</span><small>{t("WORSHIP LYRICS STUDIO")}</small></div></div></section>
    <section className="studio-stats" aria-label={t("Resumo da igreja")}>{[
      { label: 'Músicas na biblioteca', value: songs, Icon: Music2 }, { label: 'Projetos visuais', value: projects, Icon: Clapperboard }, { label: 'Seções organizadas', value: sections, Icon: FileText }, { label: 'Pessoas na equipe', value: members, Icon: Users },
    ].map(({ label, value, Icon }) => <article className="studio-stat" key={label}><span className="studio-stat-icon"><Icon size={20} /></span><div><strong>{new Intl.NumberFormat('pt-BR').format(value)}</strong><small>{t(label)}</small></div></article>)}</section>
    <section><div className="studio-section-head"><div><h2>{t("Continue de onde parou")}</h2><p>{t("Os projetos atualizados mais recentemente pela sua equipe.")}</p></div><Link href="/visual-projects">{t("Ver todos ")}<ArrowRight size={14} /></Link></div>
      {recent.length ? <div className="studio-project-grid">{recent.map(project => <ProjectCard project={project} key={project.id} />)}</div> : <div className="studio-empty"><Clapperboard size={28} /><h2>{t("Sua próxima criação começa aqui")}</h2><p>{canEdit ? t('Traga uma letra, escolha um template e crie o primeiro projeto visual da sua igreja.') : t('Os projetos da sua equipe aparecerão aqui assim que forem criados.')}</p>{canEdit && <Link href="/visual-projects/new" className="btn">{t("Criar primeiro projeto ")}<ArrowRight size={14} /></Link>}</div>}
    </section>
    <section className="studio-quick-grid" aria-label={t("Atalhos do workspace")}><Link className="studio-quick" href="/songs"><Library /><div><h3>{t("Sua biblioteca de louvor")}</h3><p>{t("Reúna as letras e mantenha o repertório organizado.")}</p></div><ArrowUpRight /></Link>{canEdit && <Link className="studio-quick" href="/songs/import"><Upload /><div><h3>{t("Traga do ProPresenter")}</h3><p>{t("Importe músicas e continue criando no Studio.")}</p></div><ArrowUpRight /></Link>}<Link className="studio-quick" href="/church"><Users /><div><h3>{t("Crie em comunidade")}</h3><p>{t("Veja a equipe e os acessos da sua igreja.")}</p></div><ArrowUpRight /></Link></section>
  </div>;
}