import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { browserLogin, cleanupTestAccount, testAccount } from './auth-helper';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
async function main() {
  const anonymous = await fetch(`${base}/billing`, { redirect: 'manual' }); assert.equal(anonymous.status, 307);
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  try {
    const errors: string[] = [];
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: log => { if (log.type === 'error') errors.push(log.text); }, onLog: () => undefined });
    await browserLogin(page);
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto({ url: `${base}/billing`, timeout: 60000 });
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        const annual = document.querySelectorAll<HTMLButtonElement>('.billing-heading button')[1]; annual?.click();
        if (document.querySelector('.billing-price')?.textContent?.includes('490,00')) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true);
    assert.equal(await page.evaluate(() => document.querySelectorAll('.billing-plan').length), 3);
    assert.equal(await page.evaluate(async () => {
      const select = document.querySelector<HTMLSelectElement>('.billing-fields select')!;
      select.value = '4k'; select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
      return document.querySelector('.billing-result')?.textContent?.startsWith('20') && document.querySelector<HTMLButtonElement>('section[aria-label="Checkout de teste"] form button')?.disabled;
    }), true, 'cost preview works and checkout requires explicit consent');
    assert.deepEqual(await page.evaluate(async () => {
      const read = await fetch('/api/billing/status');
      const csrf = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      return [read.status, (await read.json()).subscription, csrf.status];
    }), [200, null, 422]);
    await mkdir('out', { recursive: true });
    const shot = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile('out/billing-planner.png', Buffer.from(shot.value.data, 'base64'));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'plans and navigation must fit mobile');
    const account = await testAccount();
    await prisma.membership.updateMany({ where: { userId: account.userId }, data: { role: 'VIEWER' } });
    await page.goto({ url: `${base}/billing`, timeout: 60000 });
    assert.ok(page.url().endsWith('/dashboard'), 'non-owners cannot access the internal commercial simulator');
    assert.equal(await page.evaluate(async () => (await fetch('/api/billing/status')).status), 403);
    assert.deepEqual(errors.filter(message => !/server responded with a status of (422|403)/.test(message)), []);
    console.log('Billing UI validated: annual prices, credits, checkout consent, API status, mobile and owner restriction. No external billing calls.');
  } finally { await browser.close({ silent: true }); await cleanupTestAccount(); await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
