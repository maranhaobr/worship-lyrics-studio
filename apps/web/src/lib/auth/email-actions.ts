import 'server-only';
import { setTimeout } from 'node:timers/promises';
import { after } from 'next/server';
import { prisma, type Prisma } from '@wls/database';
import { z } from 'zod';
import { ApiError } from '../api-errors';
import { digest, hashPassword, token } from './crypto';
import { authTokenSchema, emailSchema, passwordSchema } from './input';
import { mailConfig, sendAccountMail, type AccountMail } from './mail';
import { rateLimit } from './session';

type Purpose = AccountMail['kind'];
export async function sendEmailToken(userId: string, purpose: Purpose, deferDelivery = false) {
  const config = mailConfig(), raw = token();
  const user = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (purpose === 'VERIFY_EMAIL' && user.emailVerifiedAt) return null;
    await tx.authToken.upsert({ where: { userId_purpose: { userId, purpose } }, create: { userId, purpose, tokenHash: digest(raw), expiresAt: new Date(Date.now() + (purpose === 'VERIFY_EMAIL' ? 86400000 : 1800000)) }, update: { tokenHash: digest(raw), expiresAt: new Date(Date.now() + (purpose === 'VERIFY_EMAIL' ? 86400000 : 1800000)) } });
    return user;
  });
  if (!user) return;
  const path = purpose === 'VERIFY_EMAIL' ? '/verify-email' : '/reset-password';
  const deliver = async () => {
    try { await sendAccountMail({ to: user.email, kind: purpose, link: `${config.origin}${path}#token=${raw}` }); }
    catch { console.error('Account email delivery failed; check SMTP availability.'); }
  };
  if (deferDelivery) after(deliver);
  else await deliver();
}

export async function requestEmailToken(body: unknown, purpose: Purpose) {
  const { email } = z.object({ email: emailSchema }).parse(body);
  await rateLimit(`mail:${purpose}:global`, 100);
  await rateLimit(`mail:${purpose}:${email}`, 3);
  mailConfig();
  const started = Date.now();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user) await sendEmailToken(user.id, purpose, true);
  // Keep fast responses similar for existing and absent addresses.
  await setTimeout(Math.max(0, 1000 - (Date.now() - started)));
}

async function consume(tx: Prisma.TransactionClient, raw: string, purpose: Purpose) {
  const initial = await tx.authToken.findUnique({ where: { tokenHash: digest(raw) } });
  if (!initial || initial.purpose !== purpose) throw new ApiError(422, 'Link inválido, expirado ou já utilizado. Solicite outro.');
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${initial.userId} FOR UPDATE`;
  const deleted = await tx.authToken.deleteMany({ where: { id: initial.id, tokenHash: digest(raw), purpose, expiresAt: { gt: new Date() } } });
  if (deleted.count !== 1) throw new ApiError(422, 'Link inválido, expirado ou já utilizado. Solicite outro.');
  return initial.userId;
}
export async function verifyEmail(body: unknown) {
  const input = z.object({ token: authTokenSchema }).parse(body);
  await rateLimit('verify-email:global', 300);
  await prisma.$transaction(async tx => {
    const userId = await consume(tx, input.token, 'VERIFY_EMAIL');
    await tx.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  });
}
export async function resetPassword(body: unknown) {
  const input = z.object({ token: authTokenSchema, password: passwordSchema }).parse(body);
  await rateLimit('reset-password:global', 100);
  await rateLimit(`reset-password:${digest(input.token)}`, 5);
  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction(async tx => {
    const userId = await consume(tx, input.token, 'RESET_PASSWORD');
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.authToken.deleteMany({ where: { userId, purpose: 'RESET_PASSWORD' } });
  });
}
