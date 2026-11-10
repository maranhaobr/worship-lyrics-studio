import { randomBytes } from 'node:crypto';
import { prisma } from '@wls/database';
import type { openBrowser } from '@remotion/renderer';
type TestBrowser = Awaited<ReturnType<typeof openBrowser>>;
type TestPage = Awaited<ReturnType<TestBrowser['newPage']>>;
const nativeFetch = globalThis.fetch;
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
let account: Promise<{ email: string; password: string; cookie: string; userId: string; churchId: string }> | undefined;
export function testAccount() {
  return account ??= (async () => {
    const email = `test-${randomBytes(12).toString('hex')}@example.test`, password = randomBytes(24).toString('base64url');
    const response = await nativeFetch(`${base}/api/auth/register`, { method: 'POST', headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name: 'Teste automático', churchName: 'Igreja de teste automático' }) });
    if (!response.ok) throw new Error(`Cadastro de teste falhou: ${response.status}`);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { memberships: true } });
    return { email, password, cookie, userId: user.id, churchId: user.memberships[0].churchId };
  })();
}
export const authenticatedFetch: typeof fetch = async (input, init) => {
  const credentials = await testAccount();
  const headers = new Headers(init?.headers); headers.set('Cookie', credentials.cookie); headers.set('Origin', new URL(base).origin);
  return nativeFetch(input, { ...init, headers });
};
export async function cleanupTestAccount() {
  if (!account) return;
  const credentials = await account;
  await prisma.user.deleteMany({ where: { id: credentials.userId } });
  await prisma.church.deleteMany({ where: { id: credentials.churchId } });
  account = undefined;
}
export async function browserLogin(page: TestPage) {
  const { email, password } = await testAccount();
  await page.goto({ url: `${base}/login`, timeout: 60000 });
  const status = await page.evaluate(async (credentials: { email: string; password: string }) => (await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })).status, { email, password });
  if (status !== 200) throw new Error('Login do navegador de teste falhou');
}
