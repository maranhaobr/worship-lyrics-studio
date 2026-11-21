import assert from 'node:assert/strict';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { distributeWords, type ProjectView } from '@wls/shared';
import { authenticatedFetch, browserLogin, cleanupTestAccount } from './auth-helper';
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
type MouseEventParams = { type: 'mousePressed' | 'mouseReleased' | 'mouseMoved'; x: number; y: number; button: 'left'; clickCount?: number; modifiers?: number; buttons?: number };
async function main() {
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  let projectId: string | undefined;
  try {
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: () => undefined, onLog: () => undefined });
    // Remotion exposes the CDP session but types only its renderer-used command subset.
    const mouse = page._client() as unknown as { send(method: 'Input.dispatchMouseEvent', params: MouseEventParams): Promise<unknown> };
    await browserLogin(page);
    const created = await authenticatedFetch(`${base}/api/visual-projects/from-lyrics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Timeline selection test', lyrics: 'Minha alegria', templateId: 'builtin-atmospheric', pace: 'balanced', varyEffects: false }) });
    assert.equal(created.status, 201); projectId = (await created.json()).id;
    const project = await (await authenticatedFetch(`${base}/api/visual-projects/${projectId}`)).json() as ProjectView;
    project.document.durationMs = 14000;
    project.document.clips = [2, 5, 8, 11].map((time, i) => ({ ...project.document.clips[0], id: `group-${i}`, text: `Bloco ${i}`, startMs: time * 1000, endMs: time * 1000 + 1000, words: distributeWords(`Bloco ${i}`, 1000) }));
    project.document.clips[0].style = { text: { ...project.document.style.text, color: '#ffcc00' } };
    assert.equal((await authenticatedFetch(`${base}/api/visual-projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: project.name, revision: project.revision, document: project.document }) })).status, 200);
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.evaluate(() => localStorage.setItem('wls-editor-autosave', 'false'));
    await page.goto({ url: `${base}/visual-projects/${projectId}`, timeout: 60000 });
    for (let i = 0; i < 100; i++) { if (await page.evaluate(() => Boolean(document.querySelector('[data-timeline-clip]')) && !document.querySelector<HTMLInputElement>('.studio-editor-header input[type="checkbox"]')?.disabled)) break; await new Promise(resolve => setTimeout(resolve, 100)); }
    await page.evaluate(() => document.querySelector('.studio-timeline')!.scrollIntoView({ block: 'center' }));
    const selected = () => page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('[data-timeline-clip][aria-pressed="true"]')).map(item => item.dataset.timelineClip));
    const positions = () => page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('[data-timeline-clip]')).map(item => Number.parseFloat(item.style.left)));
    const point = (index: number) => page.evaluate((index: number) => { const r = document.querySelectorAll('[data-timeline-clip]')[index].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, index);
    const click = async (index: number, modifiers = 0) => { const { x, y } = await point(index); await mouse.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, modifiers }); await mouse.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, modifiers }); await new Promise(resolve => setTimeout(resolve, 100)); };
    await click(0); await click(1, 2);
    assert.deepEqual(await selected(), ['group-0', 'group-1']);
    const before = await positions(); const { x, y } = await point(0);
    await mouse.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await mouse.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 60, y, button: 'left', buttons: 1 });
    await mouse.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 60, y, button: 'left', clickCount: 1 });
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.deepEqual(await positions(), [before[0] + 60, before[1] + 60, before[2], before[3]]);
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('button[aria-label="Desfazer"]')!.click());
    await new Promise(resolve => setTimeout(resolve, 100)); assert.deepEqual(await positions(), before);
    await click(1, 2); assert.deepEqual(await selected(), ['group-0']);
    await click(0); await click(2, 8); assert.deepEqual(await selected(), ['group-0', 'group-1', 'group-2']);
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-timeline button')).find(item => item.textContent === 'Selecionar vários')!.click());
    await page.evaluate(() => document.querySelector<HTMLInputElement>('input[aria-label="Selecionar bloco 2"]')!.click());
    assert.deepEqual(await selected(), ['group-0', 'group-2']);
    await page.evaluate(() => document.querySelector<HTMLInputElement>('input[aria-label="Selecionar bloco 2"]')!.click());
    assert.deepEqual(await selected(), ['group-0', 'group-1', 'group-2']);
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-timeline button')).find(item => item.textContent === 'Selecionar todos')!.click());
    assert.equal((await selected()).length, 4);
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-timeline button')).find(item => item.textContent === '+0,1s')!.click());
    await new Promise(resolve => setTimeout(resolve, 100));
    const after = await positions(); after.forEach((value, i) => assert.ok(Math.abs(value - before[i] - 6) < .01));
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-editor-header button')).find(item => item.textContent?.includes('Salvar projeto'))!.click());
    for (let i = 0; i < 100; i++) { const stored = await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } }); if ((stored.document as unknown as ProjectView['document']).clips[0].startMs === 2100) break; await new Promise(resolve => setTimeout(resolve, 100)); }
    const stored = (await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).document as unknown as ProjectView['document'];
    assert.deepEqual(stored.clips.map(clip => clip.startMs), [2100, 5100, 8100, 11100]);
    assert.deepEqual(stored.clips[0].words, project.document.clips[0].words);
    await click(0);
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-scope button')).find(button => button.textContent === 'Copiar estilo')!.click());
    await click(1);
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-scope button')).find(button => button.textContent === 'Colar estilo')!.click());
    await new Promise(resolve => setTimeout(resolve, 100));
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-editor-header button')).find(button => button.textContent?.includes('Salvar projeto'))!.click());
    let stylePersisted = false;
    for (let i = 0; i < 100; i++) {
      const saved = (await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).document as unknown as ProjectView['document'];
      if (saved.clips[1].style?.text?.color === '#ffcc00') {
        assert.deepEqual(saved.clips.map(clip => ({ ...clip, style: undefined })), stored.clips.map(clip => ({ ...clip, style: undefined })));
        assert.equal(saved.clips[2].style, undefined); stylePersisted = true; break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(stylePersisted, 'Style copy/paste must persist without altering lyric or timings');
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-timeline button')).find(button => button.textContent === 'Selecionar todos')!.click());
    await page.evaluate(() => document.querySelector('[data-timeline-clip]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true })));
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-timeline button')).find(item => item.textContent === 'Colar blocos')!.disabled), false);
    await page.evaluate(() => document.querySelector('[data-timeline-clip]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true, cancelable: true })));
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal((await positions()).length, 8);
    assert.equal((await selected()).length, 4);
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('button[aria-label="Desfazer"]')!.click());
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal((await positions()).length, 4);
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-timeline button')).find(item => item.textContent === 'Colar blocos')!.click());
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal((await positions()).length, 8);
    const normalPaste = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('.studio-timeline input[type="range"]')!;
      const event = new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true, cancelable: true });
      input.dispatchEvent(event); return event.defaultPrevented;
    });
    assert.equal(normalPaste, false, 'Inputs must keep their normal keyboard behavior');
    await page.evaluate(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.studio-editor-header button')).find(item => item.textContent?.includes('Salvar projeto'))!.click());
    let persisted = false;
    for (let i = 0; i < 100; i++) {
      const saved = (await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).document as unknown as ProjectView['document'];
      if (saved.clips.length === 8) { persisted = true; assert.equal(new Set(saved.clips.map(clip => clip.id)).size, 8); break; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(persisted, 'Pasted blocks must persist on save');
    console.log('Timeline passed: multi-selection, movement, copy/paste shortcuts and buttons, input isolation, single undo and persistence.');
  } finally { await browser.close({ silent: true }); if (projectId) await prisma.visualProject.deleteMany({ where: { id: projectId } }); await cleanupTestAccount(); await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
