import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Music2, LayoutDashboard, Library, Users } from 'lucide-react';
import { prisma } from '@wls/database';
import { roleLabels } from '@wls/shared';
import { currentActor } from '@/lib/auth/session';
import { PermissionsProvider } from '@/components/permissions-provider';
import { AccountMenu } from '@/components/account-menu';
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentActor(); if (!actor) redirect('/login');
  const memberships = await prisma.membership.findMany({ where: { userId: actor.user.id }, select: { church: { select: { id: true, name: true } } } });
  return <PermissionsProvider role={actor.role}><div className="min-h-screen md:flex"><aside className="md:w-64 shrink-0 border-r border-slate-800 p-6 bg-[#0d1422]"><Link href="/" className="flex items-center gap-3 font-bold text-xl mb-6"><Music2 className="text-accent" />Worship Lyrics</Link><p className="font-semibold break-words">{actor.church.name}</p><p className="text-sm text-slate-400 mb-5">{actor.user.name} · {roleLabels[actor.role]}</p><nav className="space-y-2"><Link href="/" className="flex items-center gap-3 p-3 hover:bg-panel rounded-xl"><LayoutDashboard size={18} />Dashboard</Link><Link href="/songs" className="flex items-center gap-3 p-3 hover:bg-panel rounded-xl"><Library size={18} />Biblioteca</Link><Link href="/visual-projects" className="flex items-center gap-3 p-3 hover:bg-panel rounded-xl"><Music2 size={18} />Projetos visuais</Link><Link href="/church" className="flex items-center gap-3 p-3 hover:bg-panel rounded-xl"><Users size={18} />Igreja e equipe</Link></nav><div className="mt-6"><AccountMenu current={actor.churchId} churches={memberships.map(member => member.church)} /></div></aside><main className="flex-1 min-w-0 p-5 md:p-10 max-w-[1500px]">{children}</main></div></PermissionsProvider>;
}
