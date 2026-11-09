import assert from 'node:assert/strict';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { exportProPresenter } from '../apps/web/src/lib/propresenter';

async function main() {
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  let songId: string | undefined, projectId: string | undefined;
  const fixture = resolve('out/propresenter-browser.pro');
  try {
    await mkdir('out', { recursive: true });
    await writeFile(fixture, exportProPresenter({ title: 'ProPresenter browser (temporário)', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Glória e paz\nSanto para sempre' }] }] }));
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: () => undefined, onLog: () => undefined });
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto({ url: `${process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000'}/songs/import`, timeout: 60000 });
    const client = page._client();
    const sample = await readFile(process.env.PROPRESENTER_SAMPLE ?? fixture);
    await page.evaluate((base64: string) => {
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (!input) throw new Error('Campo de upload não encontrado');
      const transfer = new DataTransfer();
      transfer.items.add(new File([Uint8Array.from(atob(base64), ch => ch.charCodeAt(0))], 'sample.pro'));
      input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, sample.toString('base64'));
    assert.equal(await page.evaluate(async () => {
      for (let i = 0; i < 200; i++) {
        if (Array.from(document.querySelectorAll('button')).some(b => b.textContent === 'Importar e abrir editor visual')) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    }), true, 'uploaded presentation must show its preview');
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile('out/propresenter-import.png', Buffer.from(screenshot.value.data, 'base64'));
    await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Importar e abrir editor visual')?.click());
    projectId = await page.evaluate(async () => {
      for (let i = 0; i < 300; i++) {
        const match = /^\/visual-projects\/([^/]+)$/.exec(location.pathname);
        if (match) return match[1];
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return '';
    });
    assert.ok(projectId, 'import must navigate to its visual project');
    const project = await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } });
    songId = project.songId ?? undefined;
    assert.ok(songId);
    console.log('ProPresenter browser passed: upload, preview, import and visual project.');
  } finally {
    await browser.close({ silent: true });
    if (projectId) { const project = await prisma.visualProject.findUnique({ where: { id: projectId } }); songId ??= project?.songId ?? undefined; await prisma.visualProject.deleteMany({ where: { id: projectId } }); }
    if (songId) await prisma.song.deleteMany({ where: { id: songId } });
    await unlink(fixture).catch(() => undefined);
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
