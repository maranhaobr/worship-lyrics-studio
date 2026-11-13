import { createHash } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prisma } from '@wls/database';
type Purpose = 'VERIFY_EMAIL' | 'RESET_PASSWORD';
const path = (email: string, purpose: Purpose) => resolve('.data/mail', `${createHash('sha256').update(`${email}:${purpose}`).digest('hex')}.json`);
export async function emailToken(email: string, purpose: Purpose) {
  for (let i = 0; i < 100; i++) {
    try {
      const mail = JSON.parse(await readFile(path(email, purpose), 'utf8')) as { link: string };
      const token = new URLSearchParams(new URL(mail.link).hash.slice(1)).get('token')!;
      const stored = await prisma.authToken.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') } });
      if (stored?.purpose === purpose) return token;
    } catch { /* Delivery may still be completing after the HTTP response. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('E-mail de teste não foi entregue pelo transporte local.');
}
export async function clearTestMail(email: string) {
  for (const purpose of ['VERIFY_EMAIL', 'RESET_PASSWORD'] as const) await unlink(path(email, purpose)).catch(() => undefined);
}
export async function verifyTestEmail(email: string) {
  const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
  const response = await fetch(`${base}/api/auth/verify-email`, { method: 'POST', headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token: await emailToken(email, 'VERIFY_EMAIL') }) });
  if (!response.ok) throw new Error(`Confirmação do e-mail de teste falhou: ${response.status}`);
}
