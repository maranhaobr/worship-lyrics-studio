import 'server-only';
import { cookies, headers } from 'next/headers';
import { prisma } from '@wls/database';
import { can, type Permission } from '@wls/shared';
import { ApiError } from '../api-errors';
import { digest, token } from './crypto';
export const cookieName = process.env.NODE_ENV === 'production' ? '__Host-wls_session' : 'wls_session';

export async function assertOrigin() {
  const h = await headers();
  const configured = process.env.APP_ORIGIN;
  if (!configured && process.env.NODE_ENV === 'production') throw new ApiError(503, 'Configure APP_ORIGIN antes de ativar a autenticação.');
  const expected = configured ? new URL(configured).origin : `http://${h.get('host')}`;
  if (h.get('origin') !== expected) throw new ApiError(403, 'Origem da solicitação não permitida');
}
export async function getSession() {
  const raw = (await cookies()).get(cookieName)?.value;
  if (!raw || !/^[\w-]{43}$/.test(raw)) return null;
  return prisma.session.findFirst({ where: { tokenHash: digest(raw), expiresAt: { gt: new Date() }, user: { emailVerifiedAt: { not: null } } }, include: { user: { select: { id: true, name: true, email: true } } } });
}
export async function currentActor() {
  const session = await getSession();
  if (!session) return null;
  const membership = await prisma.membership.findUnique({ where: { userId_churchId: { userId: session.userId, churchId: session.activeChurchId } }, include: { church: true } });
  return membership ? { user: session.user, church: membership.church, churchId: membership.churchId, role: membership.role, membershipId: membership.id, sessionId: session.id } : null;
}
export async function requireActor(permission: Permission = 'read') {
  const actor = await currentActor();
  if (!actor) throw new ApiError(401, 'Entre na sua conta para continuar');
  if (!can(actor.role, permission)) throw new ApiError(403, 'Seu perfil não permite esta ação');
  if (permission !== 'read') await assertOrigin();
  return actor;
}
export async function createSession(userId: string, churchId: string, expectedPasswordHash?: string) {
  const raw = token(), expiresAt = new Date(Date.now() + 7 * 86400000);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user?.emailVerifiedAt || (expectedPasswordHash && expectedPasswordHash !== user.passwordHash)) throw new ApiError(401, 'Entre novamente na sua conta');
    await tx.session.create({ data: { userId, activeChurchId: churchId, tokenHash: digest(raw), expiresAt } });
  });
  (await cookies()).set(cookieName, raw, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: expiresAt });
}
export async function destroySession() {
  const raw = (await cookies()).get(cookieName)?.value;
  if (raw) await prisma.session.deleteMany({ where: { tokenHash: digest(raw) } });
  (await cookies()).set(cookieName, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}
export async function rateLimit(identifier: string, maximum = 10) {
  const bucket = Math.floor(Date.now() / 900000);
  const key = digest(`${identifier}:${bucket}`);
  const row = await prisma.authRateLimit.upsert({ where: { key }, create: { key, resetAt: new Date((bucket + 1) * 900000) }, update: { count: { increment: 1 } } });
  if (row.count > maximum) throw new ApiError(429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.');
}
