'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music2, LayoutDashboard, Library, Users, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { roleLabels, type MemberRole } from '@wls/shared';
import { AccountMenu } from './account-menu';

export function AppShell({ children, account }: { children: React.ReactNode; account: { name: string; churchName: string; churchId: string; role: MemberRole; churches: { id: string; name: string }[] } }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isEditor = /^\/visual-projects\/[^/]+$/.test(pathname) && !pathname.endsWith('/new');
  useEffect(() => { try { setCollapsed(localStorage.getItem('wls-sidebar-collapsed') === 'true'); } catch { /* Storage may be unavailable. */ } }, []);
  function toggle() { setCollapsed(value => { const next = !value; try { localStorage.setItem('wls-sidebar-collapsed', String(next)); } catch { /* Keep the preference for this session. */ } return next; }); }
  return <div className="min-h-screen md:flex">
    <aside data-sidebar-collapsed={collapsed} className={`shrink-0 border-r border-slate-800 bg-[#0d1422] p-3 md:sticky md:top-0 md:h-dvh ${collapsed ? 'md:w-20' : 'md:w-64'}`}>
      <div className="flex items-center justify-between gap-2 mb-4 md:mb-8">
        {!collapsed && <Link href="/" className="flex items-center gap-2 font-bold text-lg"><Music2 className="text-accent shrink-0" /><span>Worship Lyrics</span></Link>}
        <button onClick={toggle} aria-expanded={!collapsed} aria-controls="main-navigation" aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} title={collapsed ? 'Expandir menu' : 'Recolher menu'} className="rounded-lg p-2 hover:bg-panel focus-visible:outline focus-visible:outline-accent">{collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}</button>
      </div>
      {!collapsed && <div className="px-3 mb-4"><p className="font-semibold break-words">{account.churchName}</p><p className="text-xs text-slate-400">{account.name} · {roleLabels[account.role]}</p></div>}
      <nav id="main-navigation" aria-label="Navegação principal" className="flex md:block gap-1 md:space-y-2">
        {[{ href: '/', label: 'Dashboard', Icon: LayoutDashboard }, { href: '/songs', label: 'Biblioteca', Icon: Library }, { href: '/visual-projects', label: 'Projetos visuais', Icon: Music2 }, { href: '/church', label: 'Igreja e equipe', Icon: Users }].map(({ href, label, Icon }) => <Link key={href} href={href} title={label} aria-label={label} aria-current={(href === '/' ? pathname === '/' : pathname.startsWith(href)) ? 'page' : undefined} className={`flex items-center gap-3 p-3 hover:bg-panel rounded-xl aria-[current=page]:bg-panel ${collapsed ? 'justify-center' : ''}`}><Icon size={18} className="shrink-0" />{!collapsed && <span className="text-sm">{label}</span>}</Link>)}
      </nav>
      <div className="mt-4"><AccountMenu compact={collapsed} current={account.churchId} churches={account.churches} /></div>
      {!collapsed && <p className="hidden md:block text-slate-500 text-xs mt-12 px-3">Studio • Editor Visual 2.0</p>}
    </aside>
    <main className={`flex-1 min-w-0 ${isEditor ? 'p-4 lg:p-6' : 'p-5 md:p-10 max-w-[1500px]'}`}>{children}</main>
  </div>;
}
