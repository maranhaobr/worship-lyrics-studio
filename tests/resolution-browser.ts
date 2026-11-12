import assert from 'node:assert/strict';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { authenticatedFetch as fetch, browserLogin, cleanupTestAccount } from './auth-helper';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
async function main() {
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  let projectId: string | undefined;
  try {
    const response = await fetch(`${base}/api/visual-projects/from-lyrics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Resolution browser test', lyrics: 'Santo para sempre' }) });
    assert.equal(response.status, 201);
    projectId = (await response.json() as { id: string }).id;
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: () => undefined, onLog: () => undefined });
    await browserLogin(page);
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto({ url: `${base}/visual-projects/${projectId}`, timeout: 30000 });
    // tsx preserves function names with a helper when serializing nested callbacks.
    await page.evaluate('globalThis.__name = (fn) => fn');
    assert.equal(await page.evaluate(async () => {
      const wait = async (check: () => boolean) => { for (let i = 0; i < 100; i++) { if (check()) return true; await new Promise(resolve => setTimeout(resolve, 100)); } return false; };
      const click = (selector: string) => document.querySelector<HTMLButtonElement>(selector)?.click();
      const select = (value: string) => { const input = document.querySelector<HTMLSelectElement>('#workspace-panel-export select')!; input.value = value; input.dispatchEvent(new Event('change', { bubbles: true })); };
      if (!await wait(() => { click('#workspace-tab-export'); return !document.querySelector('#workspace-panel-export')?.hasAttribute('hidden'); })) return false;
      select('vertical');
      if (!await wait(() => document.body.textContent!.includes('Saída atual: 1080 × 1920'))) return false;
      const rect = document.querySelector('[data-editor-preview]')!.getBoundingClientRect();
      if (Math.abs(rect.width / rect.height - 1080 / 1920) > .02 || rect.height > window.innerHeight * .55) return false;
      select('custom');
      if (!await wait(() => Boolean(document.querySelector('#workspace-panel-export input')))) return false;
      const inputs = document.querySelectorAll<HTMLInputElement>('#workspace-panel-export input');
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      for (const [index, value] of ['1601', '900'].entries()) { set.call(inputs[index], value); inputs[index].dispatchEvent(new Event('input', { bubbles: true })); }
      await new Promise(resolve => setTimeout(resolve, 100));
      click('#workspace-panel-export fieldset button');
      if (!await wait(() => Boolean(document.querySelector('#workspace-panel-export [role="alert"]')))) return false;
      set.call(inputs[0], '1600'); inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
      click('#workspace-panel-export fieldset button');
      if (!await wait(() => document.body.textContent!.includes('Saída atual: 1600 × 900'))) return false;
      Array.from(document.querySelectorAll('button')).find(item => item.textContent === 'Salvar projeto')?.click();
      return wait(() => document.querySelector('header')?.textContent?.includes('Projeto salvo') ?? false);
    }), true, 'resolution controls, portrait preview, validation and save must work');
    const saved = await (await fetch(`${base}/api/visual-projects/${projectId}`)).json() as { document: { width: number; height: number } };
    assert.equal(saved.document.width, 1600); assert.equal(saved.document.height, 900);
    console.log('Resolution UI validated: portrait preview, custom validation and persisted output size.');
  } finally {
    await browser.close({ silent: true });
    if (projectId) await prisma.visualProject.deleteMany({ where: { id: projectId } });
    await cleanupTestAccount(); await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
