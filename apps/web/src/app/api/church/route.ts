import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@wls/database';
import { can } from '@wls/shared';
import { apiResponse } from '@/lib/api-errors';
import { requireActor } from '@/lib/auth/session';
export const runtime = 'nodejs';
export async function GET() {
  return apiResponse(async () => {
    const actor = await requireActor();
    const members = await prisma.membership.findMany({ where: { churchId: actor.churchId, ...(can(actor.role, 'members') ? {} : { userId: actor.user.id }) }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'asc' } });
    const invitations = can(actor.role, 'members') ? await prisma.invitation.findMany({ where: { churchId: actor.churchId, expiresAt: { gt: new Date() } }, select: { id: true, email: true, role: true, expiresAt: true } }) : [];
    const churches = await prisma.membership.findMany({ where: { userId: actor.user.id }, select: { church: { select: { id: true, name: true } }, role: true } });
    return NextResponse.json({ church: actor.church, user: actor.user, role: actor.role, members, invitations, churches });
  });
}
export async function PATCH(request: Request) {
  return apiResponse(async () => {
    const actor = await requireActor('settings');
    const { name } = z.object({ name: z.string().trim().min(2).max(150) }).parse(await request.json());
    await prisma.church.update({ where: { id: actor.churchId }, data: { name } });
    return NextResponse.json({ ok: true });
  });
}
