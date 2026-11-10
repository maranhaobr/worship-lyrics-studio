import { prisma, Prisma } from '@wls/database';
import { z } from 'zod';
import { ApiError } from '../api-errors';
import { dummyHash, digest, hashPassword, verifyPassword } from './crypto';
import { createSession, destroySession, rateLimit } from './session';
export const emailSchema = z.string().trim().email().max(254).transform(value => value.toLowerCase());
const credentials = z.object({ email: emailSchema, password: z.string().min(1).max(128), invitation: z.string().regex(/^[\w-]{43}$/).optional() });
const registerSchema = credentials.extend({ password: z.string().min(12, 'Use uma senha com pelo menos 12 caracteres').max(128), name: z.string().trim().min(2).max(100), churchName: z.string().trim().max(150).optional() });

export async function joinInvitation(tx: Prisma.TransactionClient, raw: string, userId: string, email: string) {
  await tx.$queryRaw`SELECT id FROM "Invitation" WHERE "tokenHash"=${digest(raw)} FOR UPDATE`;
  const invitation = await tx.invitation.findUnique({ where: { tokenHash: digest(raw) } });
  if (!invitation || invitation.expiresAt < new Date() || invitation.email !== email) throw new ApiError(422, 'Convite inválido, expirado ou destinado a outro e-mail');
  const member = await tx.membership.findUnique({ where: { userId_churchId: { userId, churchId: invitation.churchId } } });
  if (!member) await tx.membership.create({ data: { userId, churchId: invitation.churchId, role: invitation.role } });
  await tx.invitation.delete({ where: { id: invitation.id } });
  return invitation.churchId;
}
export async function register(body: unknown) {
  const input = registerSchema.parse(body);
  if (!input.invitation && !input.churchName?.trim()) throw new ApiError(422, 'Informe o nome da igreja');
  await rateLimit('register:global', 100); await rateLimit(`register:${input.email}`, 5);
  const passwordHash = await hashPassword(input.password);
  try {
    const account = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { email: input.email, name: input.name, passwordHash } });
      if (input.invitation) return { userId: user.id, churchId: await joinInvitation(tx, input.invitation, user.id, user.email) };
      const church = await tx.church.create({ data: { name: input.churchName!, memberships: { create: { userId: user.id, role: 'OWNER' } } } });
      return { userId: user.id, churchId: church.id };
    });
    await destroySession(); await createSession(account.userId, account.churchId);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError(409, 'Não foi possível cadastrar com esse e-mail. Tente entrar ou use outro endereço.');
    throw error;
  }
}
export async function login(body: unknown) {
  const input = credentials.parse(body);
  await rateLimit('login:global', 300); await rateLimit(`login:${input.email}`);
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1 } } });
  const valid = await verifyPassword(input.password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) throw new ApiError(401, 'E-mail ou senha incorretos');
  let churchId = user.memberships[0]?.churchId;
  if (input.invitation) churchId = await prisma.$transaction(tx => joinInvitation(tx, input.invitation!, user.id, user.email));
  if (!churchId) throw new ApiError(403, 'Sua conta não possui vínculo com uma igreja. Solicite um novo convite.');
  await destroySession(); await createSession(user.id, churchId);
}
