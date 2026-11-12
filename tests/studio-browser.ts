import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { authenticatedFetch as fetch, browserLogin, cleanupTestAccount } from './auth-helper';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
async function main() {
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  const projectIds: string[] = [];
  try {
    for (const [name, templateId] of [['Uma só voz', 'builtin-atmospheric'], ['Uma nova manhã', 'builtin-easter'], ['Noite de luz', 'builtin-christmas']]) {
      const response = await fetch(`${base}/api/visual-projects/from-lyrics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: name, lyrics: 'Uma só voz\nUm só propósito\nA mensagem vive em cada canção', templateId }) });
      assert.equal(response.status, 201); projectIds.push((await response.json() as { id: string }).id);
    }
    const errors: string[] = [];
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: log => { if (log.type === 'error') errors.push(log.text); }, onLog: () => undefined });
    await browserLogin(page);
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto({ url: `${base}/dashboard`, timeout: 60000 });
    assert.equal(await page.evaluate(() => document.querySelectorAll('.studio-project-card').length), 3);
    assert.equal(await page.evaluate(() => document.querySelectorAll('.studio-stat strong')[1]?.textContent), '3');
    await mkdir('out', { recursive: true });
    const desktop = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile('out/studio-dashboard.png', Buffer.from(desktop.value.data, 'base64'));
    await page.goto({ url: `${base}/visual-projects/${projectIds[0]}`, timeout: 60000 });
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        document.getElementById('inspector-tab-text')?.click();
        if (document.getElementById('inspector-tab-text')?.getAttribute('aria-selected') === 'true') return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1), true);
    const editor = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile('out/studio-editor.png', Buffer.from(editor.value.data, 'base64'));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto({ url: `${base}/dashboard`, timeout: 60000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.equal(await page.evaluate(() => {
      document.querySelector<HTMLElement>('.studio-mobile-account summary')?.click();
      const menu = document.querySelector<HTMLElement>('.studio-mobile-account [aria-label="Sair da conta"]');
      return Boolean(menu && menu.getBoundingClientRect().width > 0);
    }), true, 'mobile account controls must remain available');
    await page.evaluate(() => document.querySelector<HTMLElement>('.studio-mobile-account summary')?.click());
    const mobile = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile('out/studio-mobile.png', Buffer.from(mobile.value.data, 'base64'));
    assert.deepEqual(errors, []);
    console.log('Studio UI validated: real dashboard metrics, project previews, editor viewport and mobile account access.');
  } finally {
    await browser.close({ silent: true });
    await prisma.visualProject.deleteMany({ where: { id: { in: projectIds } } });
    await cleanupTestAccount(); await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
