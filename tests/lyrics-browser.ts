import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';
import type { ProjectView } from '@wls/shared';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
async function main() {
  let projectId: string | undefined;
  const errors: string[] = [];
  const browser = await openBrowser('chrome');
  try {
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: log => { if (log.type === 'error') errors.push(log.text); }, onLog: () => undefined });
    page.on('error', error => errors.push(error.message));
    await page.bringToFront();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto({ url: `${base}/visual-projects/new`, timeout: 30000 });
    const opened = await page.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        const title = document.querySelector('input:not([type])') as HTMLInputElement | null;
        const lyrics = document.querySelector('textarea');
        if (title && lyrics) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(title, 'Letra completa (browser test)'); title.dispatchEvent(new Event('input', { bubbles: true }));
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(lyrics, '[Verso]\nSanto\nGlória'); lyrics.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise(resolve => setTimeout(resolve, 100));
          const button = Array.from(document.querySelectorAll('button')).find(item => item.textContent === 'Gerar vídeo completo');
          if (button && !button.disabled && title.value === 'Letra completa (browser test)' && button.form?.checkValidity()) { button.click(); return true; }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    });
    assert.equal(opened, true, 'whole-lyrics form must accept the text and generate the project');
    const navigated = await page.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        if (/\/visual-projects\/[^/]+$/u.test(location.pathname) && !location.pathname.endsWith('/new') && document.querySelector('[aria-pressed]')) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    });
    if (new URL(page.url()).pathname !== '/visual-projects/new') projectId = new URL(page.url()).pathname.split('/').at(-1);
    if (!navigated) console.error(await page.evaluate(() => ({ url: location.href, text: document.body.innerText, inputs: Array.from(document.querySelectorAll('input,textarea')).map(item => ({ value: (item as HTMLInputElement).value, valid: (item as HTMLInputElement).validity.valid })) })));
    assert.equal(navigated, true, 'import must open the slide editor');
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 1200; i++) {
        if (Array.from(document.querySelectorAll('a')).some(item => item.textContent === 'Baixar vídeo pronto' && item.href.startsWith('blob:'))) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true, 'automatic export must produce a downloadable MP4');
    await page.evaluate(() => {
      const select = Array.from(document.querySelectorAll('label')).find(item => item.textContent?.startsWith('Entrada'))?.querySelector('select');
      if (!select) throw new Error('Animation selector not found');
      select.value = 'zoom'; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 50; i++) {
        const save = Array.from(document.querySelectorAll('button')).find(item => item.textContent === 'Salvar projeto');
        if (save && !save.disabled) { save.click(); return true; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true);
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 100; i++) { if (Array.from(document.querySelectorAll('[role="status"]')).some(item => item.textContent === 'Projeto salvo')) return true; await new Promise(resolve => setTimeout(resolve, 100)); }
      return false;
    }), true);
    const project = await (await fetch(`${base}/api/visual-projects/${projectId}`)).json() as ProjectView;
    assert.equal(project.document.clips.length, 2); assert.equal(project.document.clips[0].style?.animation?.type, 'zoom'); assert.equal(project.document.clips[1].style?.animation?.type, 'slide');
    await mkdir('out', { recursive: true });
    const screenshot = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile('out/lyrics-editor.png', Buffer.from(screenshot.value.data, 'base64'));
    assert.deepEqual(errors, []);
    console.log('Passed: whole lyrics → automatic MP4 → independent slide customization → save.');
  } finally {
    await browser.close({ silent: true });
    if (projectId) await prisma.visualProject.deleteMany({ where: { id: projectId } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
