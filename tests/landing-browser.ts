import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from '@remotion/renderer';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
async function main() {
  assert.equal((await fetch(base)).status, 200, 'landing must be public');
  const protectedPage = await fetch(`${base}/dashboard`, { redirect: 'manual' });
  assert.equal(protectedPage.status, 307); assert.ok(protectedPage.headers.get('location')?.endsWith('/login'));
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  try {
    const errors: string[] = [];
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: log => { if (log.type === 'error') errors.push(log.text); }, onLog: () => undefined });
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto({ url: base, timeout: 60000 });
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 80; i++) {
        const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.m-theme-picker button')).find(item => item.textContent?.includes('Natal')); button?.click();
        if (document.querySelector('.m-scene-christmas')) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true, 'demo must hydrate and change themes');
    assert.equal(await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('[aria-label="Pausar demonstração"]')?.click();
      document.querySelector<HTMLElement>('.m-questions summary')?.click();
      return document.querySelector('details')?.open && !document.querySelector('#main-navigation') && document.querySelectorAll('h1').length === 1;
    }), true);
    await mkdir('out', { recursive: true });
    const desktop = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile('out/landing-desktop.png', Buffer.from(desktop.value.data, 'base64'));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    assert.equal(await page.evaluate(async () => {
      document.querySelector<HTMLButtonElement>('.m-menu-toggle')?.click();
      await new Promise(resolve => setTimeout(resolve, 150));
      return document.querySelector('.m-menu-toggle')?.getAttribute('aria-expanded') === 'true' && document.documentElement.scrollWidth <= window.innerWidth;
    }), true, 'mobile navigation must open without horizontal overflow');
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('.m-menu-toggle')?.click());
    const mobile = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile('out/landing-mobile.png', Buffer.from(mobile.value.data, 'base64'));
    assert.deepEqual(errors, [], 'landing must hydrate without console errors');
    console.log('Landing validated: public route, protected dashboard, interactive demo, FAQ and mobile navigation.');
  } finally { await browser.close({ silent: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
