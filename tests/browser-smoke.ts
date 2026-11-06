import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
async function main() {
  let songId: string | undefined, projectId: string | undefined;
  const browser = await openBrowser('chrome');
  try {
    const songResponse = await fetch(`${base}/api/songs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Browser smoke (temporário)', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Santo para sempre' }, { text: 'Glória a Ti' }] }] }) });
    assert.equal(songResponse.status, 201); songId = (await songResponse.json() as { id: string }).id;
    const projectResponse = await fetch(`${base}/api/visual-projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId }) });
    assert.equal(projectResponse.status, 201); projectId = (await projectResponse.json() as { id: string }).id;
    const errors: string[] = [];
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: log => { if (log.type === 'error') errors.push(log.text); }, onLog: () => undefined });
    page.on('error', error => errors.push(error.message));
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
      for (let i = 0; i < 100; i++) { if (document.querySelector('[role="status"]')?.textContent === 'Projeto salvo') return true; await new Promise(resolve => setTimeout(resolve, 100)); }
      return false;
    }), true, 'save must persist the edit');
    const saved = await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } }); assert.equal(saved.revision, 2);
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
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
