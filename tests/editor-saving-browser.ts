import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from '@remotion/renderer';
import { prisma } from '@wls/database';
import { authenticatedFetch, browserLogin, cleanupTestAccount } from './auth-helper';

const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
async function main() {
  const browser = await openBrowser('chrome', { browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE });
  let projectId: string | undefined;
  try {
    const page = await browser.newPage({ context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: () => undefined, onLog: () => undefined });
    await browserLogin(page);
    const created = await authenticatedFetch(`${base}/api/visual-projects/from-lyrics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Saving browser test', lyrics: 'Minha alegria\nMeu louvor', templateId: 'builtin-atmospheric', pace: 'balanced', varyEffects: false }) });
    assert.equal(created.status, 201); projectId = (await created.json()).id;
    const editorUrl = `${base}/visual-projects/${projectId}`;
    const wait = async (predicate: () => Promise<boolean>, label: string) => {
      for (let i = 0; i < 120; i++) {
        try { if (await predicate()) return; } catch (error) { if (!(error instanceof Error) || !/Execution context was destroyed|Cannot find context/.test(error.message)) throw error; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error(`Timed out: ${label}`);
    };
    const ready = () => wait(() => page.evaluate(() => Boolean(document.querySelector('.studio-editor-header input[maxlength="200"]')) && !document.querySelector<HTMLInputElement>('.studio-editor-header input[type="checkbox"]')?.disabled), 'editor loaded');
    const rename = async (name: string) => { await page.evaluate((value: string) => { const input = document.querySelector<HTMLInputElement>('.studio-editor-header input[maxlength="200"]')!; if (!input || input.disabled) throw new Error('Editor must remain editable'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }, name); await new Promise(resolve => setTimeout(resolve, 100)); };
    const click = async (text: string) => page.evaluate((label: string) => { const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(item => item.textContent?.trim() === label && !item.disabled); if (!button) throw new Error(`Button unavailable: ${label}`); button.click(); }, text);
    const modal = () => wait(() => page.evaluate(() => Boolean(document.querySelector('dialog[open]'))), 'unsaved dialog');
    const leaveLink = () => page.evaluate(() => document.querySelector<HTMLAnchorElement>('nav a[href="/songs"]')!.click());
    const atLibrary = () => wait(() => page.evaluate(() => location.pathname === '/songs'), 'navigation after decision');
    const unloadBlocked = () => page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; });
    const draft = async (text: string) => { await page.evaluate((value: string) => { const input = document.querySelector<HTMLTextAreaElement>('#workspace-panel-timeline textarea')!; Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }, text); await new Promise(resolve => setTimeout(resolve, 100)); };
    await page.evaluate(() => localStorage.setItem('wls-editor-autosave', 'false'));
    await page.goto({ url: editorUrl, timeout: 60000 }); await ready();
    assert.equal(await unloadBlocked(), false);
    await rename('Manual saved'); assert.equal(await unloadBlocked(), true);
    await draft('Letra modificada sem aplicar');
    await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('#inspector-tab-theme')!.click();
    });
    await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>('#inspector-panel-theme select')!;
      select.value = 'kinetic'; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(await page.evaluate(() => document.querySelector<HTMLTextAreaElement>('#workspace-panel-timeline textarea')!.value), 'Letra modificada sem aplicar', 'changing slide decoration must preserve unapplied lyric draft');
    await leaveLink(); await modal(); await click('Continuar editando');
    assert.equal(await page.evaluate(() => location.pathname.includes('/visual-projects/')), true);
    assert.equal((await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).name, 'Saving browser test');
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('button[aria-label="Sair da conta"]')!.click()); await modal(); await click('Continuar editando');
    assert.equal((await authenticatedFetch(`${base}/api/church`)).status, 200, 'canceling logout must preserve session');
    await leaveLink(); await modal(); await click('Salvar e sair'); await atLibrary();
    assert.equal((await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).name, 'Manual saved');
    assert.equal(((await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).document as { clips: { text: string }[] }).clips[0].text, 'Letra modificada sem aplicar');

    await page.goto({ url: editorUrl, timeout: 60000 }); await ready();
    await page.evaluate(() => { const box = Array.from(document.querySelectorAll<HTMLLabelElement>('label')).find(item => item.textContent?.includes('Salvar automaticamente'))!.querySelector<HTMLInputElement>('input')!; box.click(); });
    await rename('Automatic saved');
    await draft('Letra salva automaticamente');
    await wait(async () => (await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).name === 'Automatic saved', 'auto-save persistence');
    await wait(async () => !await unloadBlocked(), 'auto-save clears dirty flag');
    assert.equal(((await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).document as { clips: { text: string }[] }).clips[0].text, 'Letra salva automaticamente');
    await page.evaluate(() => {
      const w = window as typeof window & { saveTest?: { calls: number; pending: boolean } };
      const original = window.fetch.bind(window); w.saveTest = { calls: 0, pending: false };
      window.fetch = async (...args) => {
        if (args[1]?.method === 'PUT' && String(args[0]).startsWith('/api/visual-projects/')) { w.saveTest!.calls++; w.saveTest!.pending = true; await new Promise(resolve => setTimeout(resolve, 900)); const response = await original(...args); w.saveTest!.pending = false; return response; }
        return original(...args);
      };
    });
    await rename('First snapshot');
    await wait(() => page.evaluate(() => Boolean((window as typeof window & { saveTest?: { pending: boolean } }).saveTest?.pending)), 'delayed auto-save begins');
    await rename('Latest snapshot'); await leaveLink(); await modal(); await click('Salvar e sair'); await atLibrary();
    assert.equal((await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).name, 'Latest snapshot', 'save-and-leave must flush changes made during auto-save');

    await page.goto({ url: editorUrl, timeout: 60000 }); await ready();
    await rename('Do not auto-save while deciding'); await leaveLink(); await modal();
    await new Promise(resolve => setTimeout(resolve, 2500));
    assert.equal((await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).name, 'Latest snapshot', 'auto-save must pause while the exit decision is open');
    await click('Sair sem salvar'); await atLibrary();

    await page.goto({ url: editorUrl, timeout: 60000 }); await ready();
    assert.equal(await page.evaluate(() => localStorage.getItem('wls-editor-autosave')), 'true');
    await page.evaluate(() => Array.from(document.querySelectorAll('label')).find(item => item.textContent?.includes('Salvar automaticamente'))!.querySelector<HTMLInputElement>('input')!.click());
    await rename('Discard this'); await leaveLink(); await modal(); await click('Sair sem salvar'); await atLibrary();
    assert.equal((await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).name, 'Latest snapshot');

    await page.goto({ url: editorUrl, timeout: 60000 }); await ready();
    await draft(''); await leaveLink(); await modal(); await click('Salvar e sair');
    await wait(() => page.evaluate(() => Boolean(document.querySelector('dialog[open] [role="alert"]'))), 'invalid draft keeps modal open');
    assert.equal(await unloadBlocked(), true);
    await click('Continuar editando'); await draft('Letra salva automaticamente'); await rename('Failed attempt');
    await page.evaluate(() => {
      const original = window.fetch.bind(window);
      window.fetch = async (...args) => args[1]?.method === 'PUT' ? new Response(JSON.stringify({ error: 'Falha de teste ao salvar' }), { status: 503, headers: { 'Content-Type': 'application/json' } }) : original(...args);
    });
    await leaveLink(); await modal(); await click('Salvar e sair');
    await wait(() => page.evaluate(() => Boolean(document.querySelector('dialog[open] button:not(:disabled)')) && document.body.innerText.includes('Falha ao salvar')), 'failed save stays on page');
    assert.equal(await unloadBlocked(), true);
    await mkdir('out', { recursive: true });
    const screenshot = await page._client().send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile('out/editor-unsaved-dialog.png', Buffer.from(screenshot.value.data, 'base64'));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    assert.equal(await page.evaluate(() => { const rect = document.querySelector('dialog[open]')!.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight; }), true, 'dialog must fit mobile');
    await click('Continuar editando'); await page.evaluate(() => history.back()); await modal(); await click('Continuar editando');
    assert.equal(await unloadBlocked(), true);
    await page.evaluate(() => history.back()); await modal(); await click('Sair sem salvar'); await atLibrary();
    assert.equal((await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).name, 'Latest snapshot');
    await page.goto({ url: editorUrl, timeout: 60000 }); await ready(); await rename('Stale local edit');
    await prisma.visualProject.update({ where: { id: projectId }, data: { name: 'Saved from another tab', revision: { increment: 1 } } });
    await leaveLink(); await modal(); await click('Salvar e sair');
    await wait(() => page.evaluate(() => Boolean(document.querySelector('dialog[open] [role="alert"]'))), 'revision conflict keeps editor open');
    assert.equal((await prisma.visualProject.findUniqueOrThrow({ where: { id: projectId } })).name, 'Saved from another tab');
    await click('Sair sem salvar'); await atLibrary();
    console.log('Editor saving passed: optional persisted auto-save, draft lyrics, save race, paused decision, invalid draft, cancel/discard/save, native unload, logout guard, failed save, revision conflict, mobile and browser Back.');
  } finally { await browser.close({ silent: true }); if (projectId) await prisma.visualProject.deleteMany({ where: { id: projectId } }); await cleanupTestAccount(); await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
