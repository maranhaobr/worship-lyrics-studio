import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@wls/database';
import { canManageRole, memberRoles } from '@wls/shared';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { requireActor } from '@/lib/auth/session';
export const runtime = 'nodejs';
async function modify(request: Request, id: string, remove: boolean) {
  return apiResponse(async () => {
    const actor = await requireActor('members');
    const role = remove ? undefined : z.object({ role: z.enum(memberRoles) }).parse(await request.json()).role;
    await prisma.$transaction(async tx => {
      // Serialize membership changes per church, including concurrent last-owner removals.
      await tx.$queryRaw`SELECT id FROM "Church" WHERE id=${actor.churchId} FOR UPDATE`;
      const current = await tx.membership.findUnique({ where: { id: actor.membershipId } });
      const target = await tx.membership.findFirst({ where: { id, churchId: actor.churchId } });
      if (!target) throw new ApiError(404, 'Membro não encontrado');
      if (!current || !canManageRole(current.role, target.role) || (role && !canManageRole(current.role, role))) throw new ApiError(403, 'Seu perfil não permite alterar esse membro');
      if (target.role === 'OWNER' && role !== 'OWNER' && await tx.membership.count({ where: { churchId: actor.churchId, role: 'OWNER' } }) <= 1) throw new ApiError(409, 'A igreja precisa manter pelo menos um responsável');
      if (remove) { await tx.membership.delete({ where: { id } }); await tx.session.deleteMany({ where: { userId: target.userId, activeChurchId: actor.churchId } }); }
      else await tx.membership.update({ where: { id }, data: { role } });
    });
    return NextResponse.json({ ok: true });
  });
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { return modify(request, (await params).id, false); }
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { return modify(request, (await params).id, true); }
