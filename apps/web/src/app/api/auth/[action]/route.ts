import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@wls/database';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { register, login, joinInvitation } from '@/lib/auth/accounts';
import { assertOrigin, createSession, destroySession, getSession, rateLimit } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/crypto';
import { requestEmailToken, resetPassword, verifyEmail } from '@/lib/auth/email-actions';
import { passwordSchema } from '@/lib/auth/input';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  return apiResponse(async () => {
    await assertOrigin();
    if (Number(request.headers.get('content-length')) > 16384) throw new ApiError(413, 'Solicitação muito grande');
    const { action } = await params;
    if (action === 'logout') { await destroySession(); return NextResponse.json({ ok: true }); }
    const body: unknown = await request.json();
    if (action === 'register') { await register(body); return NextResponse.json({ ok: true, requiresVerification: true }, { status: 201 }); }
    if (action === 'login') { await login(body); return NextResponse.json({ ok: true }); }
    if (action === 'resend-verification' || action === 'forgot-password') {
      await requestEmailToken(body, action === 'resend-verification' ? 'VERIFY_EMAIL' : 'RESET_PASSWORD');
      return NextResponse.json({ ok: true, message: 'Se o endereço estiver cadastrado e a ação for necessária, você receberá um e-mail com as instruções.' });
    }
    if (action === 'verify-email') { await verifyEmail(body); return NextResponse.json({ ok: true }); }
    if (action === 'reset-password') { await resetPassword(body); return NextResponse.json({ ok: true }); }
    const session = await getSession();
    if (!session) throw new ApiError(401, 'Entre na sua conta');
    if (action === 'switch') {
      const { churchId } = z.object({ churchId: z.string() }).parse(body);
      if (!await prisma.membership.findUnique({ where: { userId_churchId: { userId: session.userId, churchId } } })) throw new ApiError(403, 'Igreja não disponível');
      await destroySession(); await createSession(session.userId, churchId);
    } else if (action === 'accept-invitation') {
      const { invitation } = z.object({ invitation: z.string().regex(/^[\w-]{43}$/) }).parse(body);
      const churchId = await prisma.$transaction(tx => joinInvitation(tx, invitation, session.userId, session.user.email));
      await destroySession(); await createSession(session.userId, churchId);
    } else if (action === 'password') {
      const input = z.object({ current: z.string().max(128), password: passwordSchema }).parse(body);
      await rateLimit(`password:${session.userId}`, 5);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
      if (!await verifyPassword(input.current, user.passwordHash)) throw new ApiError(422, 'Senha atual incorreta');
      const passwordHash = await hashPassword(input.password);
      await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
        const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
        if (current.passwordHash !== user.passwordHash) throw new ApiError(409, 'A senha mudou. Entre novamente.');
        await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
        await tx.session.deleteMany({ where: { userId: user.id } });
        await tx.authToken.deleteMany({ where: { userId: user.id, purpose: 'RESET_PASSWORD' } });
      });
      await createSession(user.id, session.activeChurchId, passwordHash);
    } else throw new ApiError(404, 'Operação não encontrada');
    return NextResponse.json({ ok: true });
  });
}
