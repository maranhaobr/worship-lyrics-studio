'use client';
import { useTranslation } from '@/components/preferences-provider';
import { PreferenceControls } from '@/components/preference-controls';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AudioLines, LayoutDashboard, Library, Users, PanelLeftClose, PanelLeftOpen, Clapperboard, ArrowUpRight, Building2, ChevronRight } from 'lucide-react';
import { roleLabels, type MemberRole } from '@wls/shared';
import { AccountMenu } from './account-menu';

const navigation = [
  { href: '/dashboard', label: 'Visão geral', Icon: LayoutDashboard },
  { href: '/songs', label: 'Biblioteca', Icon: Library },
  { href: '/visual-projects', label: 'Projetos visuais', Icon: Clapperboard },
  { href: '/church', label: 'Igreja e equipe', Icon: Users },
];
export function AppShell({ children, account }: { children: React.ReactNode; account: { name: string; churchName: string; churchId: string; role: MemberRole; churches: { id: string; name: string }[] } }) {
  const t = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isEditor = /^\/visual-projects\/[^/]+$/.test(pathname) && !pathname.endsWith('/new');
  const activePage = navigation.find(item => pathname.startsWith(item.href))?.label ?? 'Seu espaço criativo';
  useEffect(() => { try { setCollapsed(localStorage.getItem('wls-sidebar-collapsed') === 'true'); } catch { /* Storage may be unavailable. */ } }, []);
  function toggle() { setCollapsed(value => { const next = !value; try { localStorage.setItem('wls-sidebar-collapsed', String(next)); } catch { /* Keep the preference for this session. */ } return next; }); }
  return <div className={`studio-shell ${isEditor ? 'studio-shell-editor' : ''}`}>
    <aside data-sidebar-collapsed={collapsed} className="studio-sidebar">
      <div className="studio-brand-row"><Link href="/dashboard" className="studio-brand" aria-label={t("Worship Lyrics Studio, painel")}><span className="studio-brand-mark"><AudioLines size={23} /></span><span className="studio-brand-name">worship<small>LYRICS STUDIO</small></span></Link>
        <button onClick={toggle} aria-expanded={!collapsed} aria-controls="main-navigation" aria-label={collapsed ? t("Expandir menu") : t("Recolher menu")} title={collapsed ? t("Expandir menu") : t("Recolher menu")} className="studio-collapse">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button><div className="studio-mobile-preferences"><PreferenceControls /></div><details className="studio-mobile-account"><summary aria-label={t("Abrir menu da conta")}><span className="studio-avatar">{account.name.trim().slice(0, 1).toLocaleUpperCase('pt-BR')}</span></summary><div><strong>{account.name}</strong><p>{account.churchName} · {t(roleLabels[account.role])}</p><AccountMenu current={account.churchId} churches={account.churches} /></div></details></div>
      <div className="studio-church" title={account.churchName}><span className="studio-church-icon"><Building2 size={18} /></span><div className="studio-sidebar-copy"><small>{t("ESPAÇO DA IGREJA")}</small><strong>{account.churchName}</strong></div></div>
      <span className="studio-nav-caption studio-sidebar-copy">{t("ESPAÇO DE TRABALHO")}</span>
      <nav id="main-navigation" aria-label={t("Navegação principal")} className="studio-navigation">{navigation.map(({ href, label, Icon }) => <Link key={href} href={href} title={t(label)} aria-label={t(label)} aria-current={pathname.startsWith(href) ? "page" : undefined}><Icon size={19} /><span className="studio-sidebar-copy">{t(label)}</span>{pathname.startsWith(href) && <span className="studio-nav-indicator" />}</Link>)}</nav>
      <div className="studio-sidebar-preferences"><PreferenceControls /></div><div className="studio-sidebar-bottom"><Link className="studio-site-link" href="/" title={t("Conhecer o Worship Lyrics Studio")}><AudioLines size={17} /><span className="studio-sidebar-copy">{t("Feito para dar vida à mensagem")}</span><ArrowUpRight size={14} className="studio-sidebar-copy" /></Link>
        <div className="studio-profile"><span className="studio-avatar">{account.name.trim().slice(0, 1).toLocaleUpperCase('pt-BR')}</span><div className="studio-sidebar-copy"><strong>{account.name}</strong><small>{t(roleLabels[account.role])}</small></div></div>
        <AccountMenu compact={collapsed} current={account.churchId} churches={account.churches} />
      </div>
    </aside>
    <main className={`studio-main ${isEditor ? 'studio-main-editor' : ''}`}>
      {!isEditor && <div className="studio-topbar"><span>{t("Workspace ")}<ChevronRight size={13} /><strong>{t(activePage)}</strong></span><span className="studio-workspace-status"><i /> {account.churchName}</span></div>}
      {children}
    </main>
  </div>;
}
