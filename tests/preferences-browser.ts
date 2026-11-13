import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { authenticatedFetch as fetch, browserLogin, cleanupTestAccount } from './auth-helper';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
async function main() {
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  let projectId: string | undefined;
  try {
    const errors: string[] = [];
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: log => { if (log.type === 'error') errors.push(log.text); }, onLog: () => undefined });
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto({ url: base, timeout: 60000 });
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        const select = document.querySelector<HTMLSelectElement>('[data-locale-select]');
        if (select) { select.value = 'en'; select.dispatchEvent(new Event('change', { bubbles: true })); }
        if (document.documentElement.lang === 'en' && document.querySelector('h1')?.textContent?.includes('Bring life')) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true, 'landing must switch to English');
    assert.equal(await page.evaluate(async () => {
      document.querySelector<HTMLButtonElement>('[data-theme-toggle]')?.click();
      for (let i = 0; i < 50; i++) { if (document.documentElement.dataset.theme === 'dark') return getComputedStyle(document.querySelector('.marketing')!).backgroundColor === 'rgb(14, 23, 34)'; await new Promise(resolve => setTimeout(resolve, 100)); }
      return false;
    }), true);
    await page.goto({ url: base, timeout: 60000 });
    assert.equal(await page.evaluate(() => document.documentElement.lang === 'en' && document.documentElement.dataset.theme === 'dark'), true, 'preferences persist on reload');
    await mkdir('out', { recursive: true });
    const landing = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile('out/preferences-landing.png', Buffer.from(landing.value.data, 'base64'));
    const response = await fetch(`${base}/api/visual-projects/from-lyrics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Meu projeto em português', lyrics: 'Uma só voz\nUm só propósito' }) });
    assert.equal(response.status, 201); projectId = (await response.json() as { id: string }).id;
    const before = await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } });
    await browserLogin(page);
    await page.goto({ url: `${base}/visual-projects/${projectId}`, timeout: 60000 });
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        if (document.getElementById('inspector-tab-text')?.textContent === 'Text') { document.getElementById('inspector-tab-text')?.click(); return true; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true, 'editor shares language preference');
    await page.evaluate(async () => {
      const input = document.querySelector<HTMLInputElement>('.studio-editor-header input')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Rascunho não salvo');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    assert.equal(await page.evaluate(async () => {
      const select = Array.from(document.querySelectorAll<HTMLSelectElement>('[data-locale-select]')).find(item => item.getBoundingClientRect().width > 0)!;
      select.value = 'es'; select.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector<HTMLButtonElement>('.studio-sidebar [data-theme-toggle]')?.click();
      for (let i = 0; i < 100; i++) {
        if (document.documentElement.lang === 'es' && document.documentElement.dataset.theme === 'light' && document.body.textContent?.includes('Personalizar diseño')) return getComputedStyle(document.querySelector('.studio-shell')!).backgroundColor === 'rgb(243, 245, 250)';
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true, 'editor must switch to Spanish and light theme');
    assert.equal(await page.evaluate(() => document.querySelector<HTMLInputElement>('.studio-editor-header input')?.value), 'Rascunho não salvo', 'switching language must preserve unsaved edits');
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), true);
    const after = await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } }); assert.deepEqual(after.document, before.document); assert.equal(after.name, before.name);
    const editor = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile('out/preferences-editor.png', Buffer.from(editor.value.data, 'base64'));
    await page.evaluate(async (name: string) => {
      const input = document.querySelector<HTMLInputElement>('.studio-editor-header input')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, name);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
    }, before.name);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto({ url: base, timeout: 60000 });
    assert.equal(await page.evaluate(() => document.documentElement.lang === 'es' && document.documentElement.scrollWidth <= innerWidth && Boolean(document.querySelector('[data-theme-toggle]')?.getBoundingClientRect().width)), true, 'controls remain available on mobile');
    assert.deepEqual(errors, []);
    console.log('Preferences validated: three languages, both themes, SSR persistence, mobile and unchanged song/project content.');
  } finally {
    await browser.close({ silent: true });
    if (projectId) await prisma.visualProject.deleteMany({ where: { id: projectId } });
    await cleanupTestAccount(); await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
