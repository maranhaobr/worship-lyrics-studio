import { redirect } from 'next/navigation';
import { prisma } from '@wls/database';
import { currentActor } from '@/lib/auth/session';
import { PermissionsProvider } from '@/components/permissions-provider';
import { AppShell } from '@/components/app-shell';
import '../studio.css';
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentActor(); if (!actor) redirect('/login');
  const memberships = await prisma.membership.findMany({ where: { userId: actor.user.id }, select: { church: { select: { id: true, name: true } } } });
  return <PermissionsProvider role={actor.role}><AppShell account={{ name: actor.user.name, churchName: actor.church.name, churchId: actor.churchId, role: actor.role, churches: memberships.map(member => member.church) }}>{children}</AppShell></PermissionsProvider>;
}
