import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@wls/database';
import { canManageRole } from '@wls/shared';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { requireActor } from '@/lib/auth/session';
import { emailSchema } from '@/lib/auth/accounts';
import { digest, token } from '@/lib/auth/crypto';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return apiResponse(async () => {
    const actor = await requireActor('members');
    const input = z.object({ email: emailSchema, role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']) }).parse(await request.json());
    if (!canManageRole(actor.role, input.role)) throw new ApiError(403, 'Você não pode convidar para esse perfil');
    if (await prisma.membership.findFirst({ where: { churchId: actor.churchId, user: { email: input.email } } })) throw new ApiError(409, 'Esse usuário já é membro');
    const raw = token();
    await prisma.$transaction(async tx => {
      await tx.invitation.deleteMany({ where: { churchId: actor.churchId, email: input.email } });
      await tx.invitation.create({ data: { churchId: actor.churchId, email: input.email, role: input.role, tokenHash: digest(raw), expiresAt: new Date(Date.now() + 7 * 86400000) } });
    });
    return NextResponse.json({ path: `/register?invitation=${raw}` }, { status: 201 });
  });
}
export async function DELETE(request: Request) {
  return apiResponse(async () => {
    const actor = await requireActor('members');
    const { id } = z.object({ id: z.string() }).parse(await request.json());
    const invite = await prisma.invitation.findFirst({ where: { id, churchId: actor.churchId } });
    if (!invite) throw new ApiError(404, 'Convite não encontrado');
    if (!canManageRole(actor.role, invite.role)) throw new ApiError(403, 'Seu perfil não permite revogar esse convite');
    await prisma.invitation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
