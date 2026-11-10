import { authenticatedFetch as fetch, cleanupTestAccount, browserLogin } from './auth-helper';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
async function main() {
  let songId: string | undefined, projectId: string | undefined;
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  try {
    const songResponse = await fetch(`${base}/api/songs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Browser smoke (temporário)', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Santo para sempre' }, { text: 'Glória a Ti' }] }] }) });
    assert.equal(songResponse.status, 201); songId = (await songResponse.json() as { id: string }).id;
    const projectResponse = await fetch(`${base}/api/visual-projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId }) });
    assert.equal(projectResponse.status, 201); projectId = (await projectResponse.json() as { id: string }).id;
    const errors: string[] = [];
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: log => { if (log.type === 'error') errors.push(log.text); }, onLog: () => undefined });
    page.on('error', error => errors.push(error.message));
    await browserLogin(page);
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto({ url: `${base}/visual-projects/${projectId}`, timeout: 30000 });
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        const button = Array.from(document.querySelectorAll('button')).find(item => item.textContent === 'Adicionar bloco');
        if (button && document.querySelectorAll('[role="button"]').length === 2) { button.click(); await new Promise(resolve => setTimeout(resolve, 100)); if (document.querySelectorAll('[role="button"]').length === 3) return true; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true, 'editor must hydrate and add a timeline clip');
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 50; i++) {
        const label = Array.from(document.querySelectorAll('label')).find(item => item.textContent?.startsWith('Posição de reprodução'));
        if (Number(label?.querySelector('input')?.value) >= 8000) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true, 'preview must seek to a newly appended clip after its duration updates');
    assert.equal(await page.evaluate(async () => {
      const button = Array.from(document.querySelectorAll('button')).find(item => item.textContent === 'Desfazer'); button?.click();
      for (let i = 0; i < 50; i++) { if (document.querySelectorAll('[role="button"]').length === 2) return true; await new Promise(resolve => setTimeout(resolve, 100)); }
      return false;
    }), true, 'undo must restore the timeline');
    assert.equal(await page.evaluate(async () => {
      const button = Array.from(document.querySelectorAll('button')).find(item => item.textContent === 'Refazer'); button?.click();
      for (let i = 0; i < 50; i++) { if (document.querySelectorAll('[role="button"]').length === 3) return true; await new Promise(resolve => setTimeout(resolve, 100)); }
      return false;
    }), true, 'redo must restore the new clip');
    assert.equal(await page.evaluate(async () => {
      const button = Array.from(document.querySelectorAll('button')).find(item => item.textContent === 'Salvar projeto'); button?.click();
      for (let i = 0; i < 100; i++) { if (document.querySelector('[data-toast-kind="success"]')?.textContent?.includes('Projeto salvo')) return true; await new Promise(resolve => setTimeout(resolve, 100)); }
      return false;
    }), true, 'save must persist the edit');
    const saved = await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } }); assert.equal(saved.revision, 2);
    assert.equal(await page.evaluate(async () => {
      document.querySelector<HTMLButtonElement>('[aria-label="Aplicar Natal · Noite de luz"]')?.click();
      for (let i = 0; i < 50; i++) {
        const label = Array.from(document.querySelectorAll('label')).find(item => item.textContent?.startsWith('Tema decorativo'));
        if (label?.querySelector('select')?.value === 'christmas') {
          const save = Array.from(document.querySelectorAll('button')).find(item => item.textContent === 'Salvar projeto');
          save?.click();
          for (let j = 0; j < 100; j++) {
            if (document.body.textContent?.includes('revisão 3')) return document.fonts.check('400 80px "Playfair Display"');
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true, 'seasonal template must apply, load its font and save');
    const themed = await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } });
    const { visualProjectSchema } = await import('@wls/shared');
    const themedDocument = visualProjectSchema.parse(themed.document);
    assert.equal(themedDocument.clips[2].style?.decoration?.theme, 'christmas');
    assert.equal(themedDocument.clips[2].style?.text?.fontFamily, 'Playfair Display');
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 60; i++) {
        if (!document.querySelector('[data-toast-kind="success"]')) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true, 'success notification must disappear automatically');
    assert.equal(await page.evaluate(async () => {
      const label = Array.from(document.querySelectorAll('label')).find(item => item.textContent?.startsWith('Duração total'));
      const input = label?.querySelector('input');
      if (!input) return false;
      input.value = '0'; input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 150));
      const error = document.querySelector('[data-toast-kind="error"]');
      if (!error?.classList.contains('bg-red-950') || !error.querySelector('[role="alert"]')) return false;
      error.querySelector<HTMLButtonElement>('button')?.click();
      await new Promise(resolve => setTimeout(resolve, 100));
      return !document.querySelector('[data-toast-kind="error"]');
    }), true, 'invalid changes must show a red accessible error toast that can be dismissed');
    assert.equal(await page.evaluate(async () => {
      const preview = document.querySelector<HTMLElement>('[data-editor-preview]');
      const inspector = document.querySelector<HTMLElement>('[data-inspector-scroll]');
      if (!preview || !inspector) return false;
      document.getElementById('inspector-tab-text')?.click();
      await new Promise(resolve => setTimeout(resolve, 150));
      const before = preview.getBoundingClientRect();
      inspector.scrollTop = inspector.scrollHeight;
      await new Promise(resolve => setTimeout(resolve, 150));
      const after = preview.getBoundingClientRect();
      return inspector.scrollTop > 0 && Math.abs(before.top - after.top) < 1 && after.top >= 0 && after.bottom <= window.innerHeight && document.documentElement.scrollHeight <= window.innerHeight + 1;
    }), true, 'settings must scroll independently while the preview stays fully visible');
    assert.equal(await page.evaluate(async () => {
      const columns = document.querySelector('.editor-columns');
      const before = columns?.getBoundingClientRect().width ?? 0;
      document.querySelector<HTMLButtonElement>('[aria-label="Recolher menu"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 150));
      return (columns?.getBoundingClientRect().width ?? 0) > before && document.querySelector('[aria-label="Expandir menu"]')?.getAttribute('aria-expanded') === 'false' && localStorage.getItem('wls-sidebar-collapsed') === 'true';
    }), true, 'collapsing navigation must widen the workspace and remember the preference');
    await mkdir('out', { recursive: true });
    const screenshot = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile('out/editor-smoke.png', Buffer.from(screenshot.value.data, 'base64'));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'mobile layout must not overflow');
    assert.deepEqual(errors, []);
    console.log('Browser smoke passed: hydration, timeline, undo/redo, save and mobile layout. Screenshot: out/editor-smoke.png');
  } finally {
    await browser.close({ silent: true });
    if (projectId) await prisma.visualProject.deleteMany({ where: { id: projectId } });
    if (songId) await prisma.song.deleteMany({ where: { id: songId } });
    await cleanupTestAccount();
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
