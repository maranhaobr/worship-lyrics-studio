import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { emailToken, clearTestMail } from './email-helper';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
async function main() {
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  const email = `email-browser-${randomBytes(8).toString('hex')}@example.test`, password = randomBytes(24).toString('base64url');
  const nextPassword = randomBytes(24).toString('base64url');
  let churchId: string | undefined;
  try {
    const registered = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name: 'Teste navegador', churchName: 'Teste de confirmação' }) });
    assert.equal(registered.status, 201);
    churchId = (await prisma.membership.findFirstOrThrow({ where: { user: { email } } })).churchId;
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: () => undefined, onLog: () => undefined });
    await page.goto({ url: `${base}/verify-email#token=${await emailToken(email, 'VERIFY_EMAIL')}`, timeout: 60000 });
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        const button = document.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (button?.textContent === 'Confirmar e-mail') { button.click(); break; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      for (let i = 0; i < 100; i++) { if (document.querySelector('[role="status"]')?.textContent?.includes('E-mail confirmado')) return window.location.hash === ''; await new Promise(resolve => setTimeout(resolve, 100)); }
      return false;
    }), true, 'email link must survive hydration and confirm on explicit submission');
    await page.goto({ url: `${base}/forgot-password`, timeout: 30000 });
    assert.equal(await page.evaluate(async (email: string) => {
      for (let i = 0; i < 100; i++) {
        const input = document.querySelector<HTMLInputElement>('input[name="email"]');
        if (input) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, email); input.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise(resolve => setTimeout(resolve, 100)); document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click(); break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      for (let i = 0; i < 100; i++) { if (document.querySelector('[role="status"]')) return true; await new Promise(resolve => setTimeout(resolve, 100)); }
      return false;
    }, email), true);
    await page.goto({ url: `${base}/reset-password#token=${await emailToken(email, 'RESET_PASSWORD')}`, timeout: 30000 });
    assert.equal(await page.evaluate(async (password: string) => {
      for (let i = 0; i < 100; i++) {
        const inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
        if (inputs.length === 2) {
          for (const input of inputs) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, password); input.dispatchEvent(new Event('input', { bubbles: true })); }
          await new Promise(resolve => setTimeout(resolve, 100)); document.querySelector<HTMLButtonElement>('button[type="submit"]')?.click(); break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      for (let i = 0; i < 100; i++) { if (document.querySelector('[role="status"]')?.textContent?.includes('Senha redefinida')) return window.location.hash === ''; await new Promise(resolve => setTimeout(resolve, 100)); }
      return false;
    }, nextPassword), true, 'reset form must accept the emailed token and matching new passwords');
    console.log('Email UI validated: confirmation, recovery form, reset form and fragment removal.');
  } finally {
    await browser.close({ silent: true });
    await prisma.user.deleteMany({ where: { email } });
    if (churchId) await prisma.church.deleteMany({ where: { id: churchId } });
    await clearTestMail(email); await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
